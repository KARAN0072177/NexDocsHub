import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { forgotPasswordService } from "@/features/auth/services/forgot-password.service";
import { rateLimitService } from "@/features/auth/services/rate-limit.service";
import { ipBanService } from "@/features/auth/services/ip-ban.service";
import { forgotPasswordRequestSchema } from "@/features/auth/schemas/forgot-password.schema";

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

const REQUEST_LIMIT_CONFIG = {
  maxAttempts: 3,
  windowMinutes: 15,
  blockMinutes: 15,
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const ip = getClientIp(request);

    // 1. IP Ban check
    if (await ipBanService.isBanned(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "IP_BANNED",
            message:
              "Access denied. This IP address has been banned for suspicious activity.",
          },
        },
        { status: 403 }
      );
    }

    const ipKey = `rate-limit:forgot-password:request:ip:${ip}`;

    // 2. Check IP rate limit
    const ipLimit = await rateLimitService.evaluate(
      ipKey,
      REQUEST_LIMIT_CONFIG
    );

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many password reset requests. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validation = forgotPasswordRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email or username is required.",
            fieldErrors: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // 3. Consume rate limit attempt for every request to prevent flooding/spam
    await rateLimitService.recordFailure(ipKey, REQUEST_LIMIT_CONFIG);

    // 4. Request Reset Code
    const result = await forgotPasswordService.requestReset(
      validation.data.identifier
    );

    if (!result.success) {
      return NextResponse.json(result, {
        status: result.error.code === "COOLDOWN_ACTIVE" ? 429 : 400,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Forgot Password Request API Error:", error);

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
