import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { forgotPasswordService } from "@/features/auth/services/forgot-password.service";
import { rateLimitService } from "@/features/auth/services/rate-limit.service";
import { forgotPasswordVerifySchema } from "@/features/auth/schemas/forgot-password.schema";

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

const VERIFY_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMinutes: 15,
  blockMinutes: 15,
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const ip = getClientIp(request);
    const ipKey = `rate-limit:forgot-password:verify:ip:${ip}`;

    // 1. Check IP rate limit
    const ipLimit = await rateLimitService.evaluate(
      ipKey,
      VERIFY_LIMIT_CONFIG
    );

    if (!ipLimit.allowed) {
      const blockedUntil = ipLimit.blockedUntil;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: `Too many verify attempts. Locked out until ${blockedUntil?.toLocaleTimeString()}.`,
          },
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validation = forgotPasswordVerifySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email and 6-digit OTP code are required.",
            fieldErrors: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // 3. Verify Code
    const { email, otp } = validation.data;
    const result = await forgotPasswordService.verifyOTP(email, otp);

    if (!result.success) {
      // Record failure attempt on the IP
      await rateLimitService.recordFailure(ipKey, VERIFY_LIMIT_CONFIG);

      const statusMap: Record<string, number> = {
        SESSION_EXPIRED: 400,
        TOO_MANY_ATTEMPTS: 403,
        INVALID_OTP: 401,
      };

      return NextResponse.json(result, {
        status: statusMap[result.error.code] ?? 400,
      });
    }

    // Success: Reset rate limit for this IP
    await rateLimitService.reset(ipKey);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Forgot Password Verify API Error:", error);

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
