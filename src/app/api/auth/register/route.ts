import { NextRequest, NextResponse } from "next/server";

import { registerUser } from "@/features/auth/services/register.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await registerUser(body);

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        errors: result.errors,
      },
      {
        status: result.status,
      }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error.",
      },
      {
        status: 500,
      }
    );
  }
}