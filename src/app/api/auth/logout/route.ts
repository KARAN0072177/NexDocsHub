import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { authLogService } from "@/features/auth/services/auth-log.service";

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
    await dbConnect();

    const ip = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? undefined;

    // 1. Get current session token from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    let email = "";

    if (sessionCookie?.value) {
      const sessionRecord = await Session.findOne({
        sessionToken: sessionCookie.value,
      }).lean();

      if (sessionRecord) {
        const userRecord = await User.findById(sessionRecord.userId).lean();
        if (userRecord) {
          email = userRecord.email;
        }
      }

      // 2. Revoke session in database
      await Session.deleteOne({ sessionToken: sessionCookie.value });
    }

    // 3. Clear browser cookie
    cookieStore.delete("session");

    // 4. Log the logout action
    await authLogService.logAction({
      action: "logout",
      email,
      ipAddress: ip,
      status: "success",
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        data: null,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Logout API Error:", error);

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
