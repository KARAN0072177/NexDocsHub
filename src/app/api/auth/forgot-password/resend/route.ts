import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { forgotPasswordService } from "@/features/auth/services/forgot-password.service";
import { rateLimitService } from "@/features/auth/services/rate-limit.service";

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

const RESEND_LIMIT_CONFIG = {
  maxAttempts: 3,
  windowMinutes: 15,
  blockMinutes: 15,
};

const resendBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .toLowerCase(),
});

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const ip = getClientIp(request);
    const ipKey = `rate-limit:forgot-password:resend:ip:${ip}`;

    // 1. Check IP rate limit
    const ipLimit = await rateLimitService.evaluate(
      ipKey,
      RESEND_LIMIT_CONFIG
    );

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many resend attempts. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validation = resendBodySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email is required.",
            fieldErrors: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // 3. Consume attempt
    await rateLimitService.recordFailure(ipKey, RESEND_LIMIT_CONFIG);

    // 4. Resend Code
    const result = await forgotPasswordService.resendOTP(
      validation.data.email
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error.code === "COOLDOWN_ACTIVE" ? 429 : 400,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Forgot Password Resend API Error:", error);

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
