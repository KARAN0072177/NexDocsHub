import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";

export async function POST() {
  try {
    await dbConnect();

    // 1. Get current session token from cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie?.value) {
      // 2. Revoke session in database
      await Session.deleteOne({ sessionToken: sessionCookie.value });
    }

    // 3. Clear browser cookie
    cookieStore.delete("session");

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
