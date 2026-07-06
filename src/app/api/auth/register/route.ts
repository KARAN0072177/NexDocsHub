import { NextRequest, NextResponse } from "next/server";

import { dbConnect } from "@/lib/db";
import { registerService } from "@/features/auth/services/register.service";

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

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