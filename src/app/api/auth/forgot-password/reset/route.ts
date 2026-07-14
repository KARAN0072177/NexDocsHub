import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { forgotPasswordService } from "@/features/auth/services/forgot-password.service";
import { rateLimitService } from "@/features/auth/services/rate-limit.service";
import { forgotPasswordResetSchema } from "@/features/auth/schemas/forgot-password.schema";

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

const RESET_LIMIT_CONFIG = {
  maxAttempts: 3,
  windowMinutes: 15,
  blockMinutes: 15,
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const ip = getClientIp(request);
    const ipKey = `rate-limit:forgot-password:reset:ip:${ip}`;

    // 1. Check IP rate limit
    const ipLimit = await rateLimitService.evaluate(
      ipKey,
      RESET_LIMIT_CONFIG
    );

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many password reset attempts. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validation = forgotPasswordResetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please correct the highlighted fields.",
            fieldErrors: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // 3. Reset Password
    const { email, password } = validation.data;
    const result = await forgotPasswordService.resetPassword(email, password);

    if (!result.success) {
      // Record failure attempt on the IP
      await rateLimitService.recordFailure(ipKey, RESET_LIMIT_CONFIG);

      const statusMap: Record<string, number> = {
        UNAUTHORIZED: 401,
        USER_NOT_FOUND: 404,
        PASSWORD_REUSE: 400,
      };

      return NextResponse.json(result, {
        status: statusMap[result.error.code] ?? 400,
      });
    }

    // Success: Reset rate limit for this IP
    await rateLimitService.reset(ipKey);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Forgot Password Reset API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong. Please try again later.",
        },
      },
      { status: 500 }
    );
  }
}
