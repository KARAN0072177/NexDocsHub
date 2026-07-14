import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { dbConnect } from "@/lib/db";
import { loginService } from "@/features/auth/services/login.service";
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

export async function POST(request: NextRequest) {
  try {
    // 1. Establish DB Connection
    await dbConnect();

    // 2. Parse request details
    const body = await request.json();
    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // 3. IP Ban Check
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
        {
          status: 403,
        }
      );
    }

    // 4. Invoke Login Service
    const result = await loginService.login(body, ip, userAgent);

    if (!result.success) {
      const statusCode: Record<string, number> = {
        VALIDATION_ERROR: 400,
        INVALID_CREDENTIALS: 401,
        EMAIL_NOT_VERIFIED: 403,
        TOO_MANY_REQUESTS: 429,
      };

      return NextResponse.json(result, {
        status: statusCode[result.error.code] ?? 400,
      });
    }

    // 4. Set Session Cookie on Success
    const cookieStore = await cookies();
    cookieStore.set({
      name: "session",
      value: result.data.sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          role: result.data.role,
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Login API Error:", error);

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
