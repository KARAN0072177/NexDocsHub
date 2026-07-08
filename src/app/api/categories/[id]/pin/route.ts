import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { Category } from "@/models/Category";

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    return null;
  }

  const sessionRecord = await Session.findOne({ sessionToken }).lean();

  if (!sessionRecord || sessionRecord.expiresAt < new Date()) {
    return null;
  }

  return sessionRecord.userId.toString();
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to modify categories.",
          },
        },
        { status: 401 }
      );
    }

    const { id: categoryId } = await params;
    const body = await request.json();
    const { isPinned } = body;

    if (typeof isPinned !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "isPinned must be a boolean value.",
          },
        },
        { status: 400 }
      );
    }

    // Find the category
    const category = await Category.findOne({ _id: categoryId, userId });
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CATEGORY_NOT_FOUND",
            message: "Category not found or access denied.",
          },
        },
        { status: 404 }
      );
    }

    // Enforce 3-pin limit if pinning
    if (isPinned && !category.isPinned) {
      const pinnedCount = await Category.countDocuments({
        userId,
        isPinned: true,
      });

      if (pinnedCount >= 3) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "PIN_LIMIT_REACHED",
              message: "You can only pin up to 3 categories.",
            },
          },
          { status: 400 }
        );
      }
    }

    // Update pin state
    category.isPinned = isPinned;
    await category.save();

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("PUT Category Pin Error:", error);
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
