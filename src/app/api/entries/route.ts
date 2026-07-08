import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { Category } from "@/models/Category";
import { Entry } from "@/models/Entry";
import { entrySchema } from "@/features/entries/schemas/entry.schema";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
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

async function signAttachments(attachments: any[]): Promise<any[]> {
  return Promise.all(
    attachments.map(async (att) => {
      try {
        const urlObj = new URL(att.url);
        const key = decodeURIComponent(urlObj.pathname.slice(1));
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: key,
        });
        const signedUrl = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // 1 hour
        });
        return {
          ...att,
          url: signedUrl,
        };
      } catch (err) {
        console.error("Error signing attachment URL:", att.url, err);
        return att;
      }
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to view entries.",
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    if (!categoryId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "categoryId query parameter is required.",
          },
        },
        { status: 400 }
      );
    }

    // Verify category belongs to user
    const category = await Category.findOne({
      _id: categoryId,
      userId,
    }).lean();

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

    const entries = await Entry.find({ categoryId, userId })
      .sort({ createdAt: -1 })
      .lean();

    // Map and sign attachments dynamically
    const signedEntries = await Promise.all(
      entries.map(async (entry: any) => ({
        ...entry,
        attachments: await signAttachments(entry.attachments),
      }))
    );

    return NextResponse.json({
      success: true,
      data: signedEntries,
    });
  } catch (error) {
    console.error("GET Entries Error:", error);
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
            message: "You must be logged in to create entries.",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = entrySchema.safeParse(body);

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

    const { categoryId, title, content, type, tags, attachments, customType, format } =
      validation.data;

    // Verify category exists and belongs to user
    const category = await Category.findOne({
      _id: categoryId,
      userId,
    }).lean();

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

    // Strip any temporary presigned query parameters from S3 URLs before saving
    const cleanAttachments = attachments.map((att) => ({
      ...att,
      url: att.url.split("?")[0],
    }));

    // Create entry under the category workspace
    const newEntry = await Entry.create({
      title,
      content: format === "files" ? "" : content,
      type,
      customType: type === "custom" ? customType : undefined,
      format,
      tags,
      attachments: cleanAttachments,
      categoryId,
      workspaceId: category.workspaceId,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: newEntry,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST Entry Error:", error);
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
