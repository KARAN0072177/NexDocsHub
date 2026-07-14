import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { registerService } from "@/features/auth/services/register.service";
import { rateLimitService } from "@/features/auth/services/rate-limit.service";
import { ipBanService } from "@/features/auth/services/ip-ban.service";

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

const REGISTER_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMinutes: 30,
  blockMinutes: 30,
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

    // 2. Rate Limiting Check
    const ipKey = `rate-limit:register:ip:${ip}`;
    const ipLimit = await rateLimitService.evaluate(
      ipKey,
      REGISTER_LIMIT_CONFIG
    );

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: "Too many registration attempts. Please try again later.",
          },
        },
        { status: 429 }
      );
    }

    // Record the registration attempt
    await rateLimitService.recordFailure(ipKey, REGISTER_LIMIT_CONFIG);

    const body = await request.json();
    const result = await registerService.register(body);

    if (!result.success) {
      const statusCode: Record<string, number> = {
        VALIDATION_ERROR: 400,
        EMAIL_ALREADY_EXISTS: 409,
        USERNAME_ALREADY_EXISTS: 409,
      };

      return NextResponse.json(result, {
        status: statusCode[result.error.code] ?? 400,
      });
    }

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    console.error("Register API Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Something went wrong. Please try again later.",
        },
      },
      {
        status: 500,
      }
    );
  }
}