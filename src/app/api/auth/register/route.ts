import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "Registration has moved to the new architecture.",
    },
    {
      status: 410,
    }
  );
}
