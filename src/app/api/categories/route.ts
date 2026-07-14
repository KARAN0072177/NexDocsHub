import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { Workspace } from "@/models/Workspace";
import { Category } from "@/models/Category";
import { User } from "@/models/User";

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Category name is required.")
    .max(50, "Category name cannot exceed 50 characters."),
});

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

export async function GET() {
  try {
    await dbConnect();

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to view categories.",
          },
        },
        { status: 401 }
      );
    }

    const categories = await Category.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("GET Categories Error:", error);
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to create categories.",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = createCategorySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input values.",
            fieldErrors: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    // Resolve or provision user workspace
    let workspace = await Workspace.findOne({ userId }).lean();
    if (!workspace) {
      const userRecord = await User.findById(userId).lean();
      const username = userRecord?.username ?? "User";
      workspace = await Workspace.create({
        name: `${username}'s Workspace`,
        userId,
      });
    }

    const { name } = validation.data;

    // Avoid duplicate category name under same workspace
    const duplicate = await Category.findOne({
      userId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
    }).lean();

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_CATEGORY",
            message: "A category with this name already exists.",
          },
        },
        { status: 400 }
      );
    }

    const newCategory = await Category.create({
      name,
      workspaceId: workspace._id,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: newCategory,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Category Error:", error);
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
