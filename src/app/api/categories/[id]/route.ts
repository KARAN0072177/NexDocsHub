import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { Category } from "@/models/Category";
import { Entry } from "@/models/Entry";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const renameCategorySchema = z.object({
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

// PUT /api/categories/[id] - Rename Category
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
    const validation = renameCategorySchema.safeParse(body);

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

    const { name } = validation.data;

    // Check if category exists and belongs to user
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

    // Check for duplicates (excluding current category)
    const duplicate = await Category.findOne({
      userId,
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: categoryId },
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

    category.name = name;
    await category.save();

    return NextResponse.json({
      success: true,
      data: {
        id: category._id.toString(),
        name: category.name,
        isPinned: !!category.isPinned,
      },
    });
  } catch (error) {
    console.error("Rename Category Error:", error);
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

// DELETE /api/categories/[id] - Delete Category & Cascade Sweeper to S3
export async function DELETE(
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
            message: "You must be logged in to delete categories.",
          },
        },
        { status: 401 }
      );
    }

    const { id: categoryId } = await params;

    // Find category to verify ownership
    const category = await Category.findOne({ _id: categoryId, userId }).lean();
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

    // Retrieve all entries under this category
    const entries = await Entry.find({ categoryId, userId }).lean();

    // Cascading S3 object cleanup: loop entries and delete attachments
    for (const entry of entries) {
      for (const attachment of entry.attachments) {
        try {
          const urlObj = new URL(attachment.url);
          const key = decodeURIComponent(urlObj.pathname.slice(1));
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_BUCKET_NAME!,
              Key: key,
            })
          );
        } catch (s3Error) {
          console.error(
            "Failed to delete S3 object during cascading category deletion:",
            attachment.url,
            s3Error
          );
        }
      }
    }

    // Delete all document entries in MongoDB
    await Entry.deleteMany({ categoryId, userId });

    // Delete category folder
    await Category.deleteOne({ _id: categoryId, userId });

    return NextResponse.json({
      success: true,
      message: "Category and all associated documents deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Category Error:", error);
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
