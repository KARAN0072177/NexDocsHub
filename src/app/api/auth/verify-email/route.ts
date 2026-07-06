import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { verifyEmailService } from "@/features/auth/services/verify-email.service";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const token =
      request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL(
          "/login?error=invalid_token",
          request.url
        )
      );
    }

    const result =
      await verifyEmailService.verify(token);

    if (!result.success) {
      const redirectMap: Record<string, string> = {
        INVALID_TOKEN:
          "/login?error=invalid_token",

        TOKEN_EXPIRED:
          "/login?error=expired_token",
      };

      return NextResponse.redirect(
        new URL(
          redirectMap[result.error.code] ??
            "/login?error=verification_failed",
          request.url
        )
      );
    }

    return NextResponse.redirect(
      new URL(
        "/login?verified=true",
        request.url
      )
    );
  } catch (error) {
    console.error(
      "Verify Email API Error:",
      error
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=server_error",
        request.url
      )
    );
  }
}