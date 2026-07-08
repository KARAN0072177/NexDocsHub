import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { userRepository } from "@/features/auth/repositories/user.repository";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const user = await userRepository.findByEmail(email.toLowerCase().trim());
    return NextResponse.json({
      success: true,
      verified: !!user,
    });
  } catch (error) {
    console.error("Verification status API Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
