import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { S3Client, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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

export async function GET(
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
            message: "You must be logged in to view this entry.",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const entry = await Entry.findOne({ _id: id, userId }).lean();

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ENTRY_NOT_FOUND",
            message: "Entry not found or access denied.",
          },
        },
        { status: 404 }
      );
    }

    // Generate temporary S3 GET URLs for download/display
    const signedAttachments = await signAttachments(entry.attachments);

    return NextResponse.json({
      success: true,
      data: {
        ...entry,
        attachments: signedAttachments,
      },
    });
  } catch (error) {
    console.error("GET Entry ID Error:", error);
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
            message: "You must be logged in to edit this entry.",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
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

    // Verify entry exists and belongs to user
    const entry = await Entry.findOne({ _id: id, userId });
    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ENTRY_NOT_FOUND",
            message: "Entry not found or access denied.",
          },
        },
        { status: 404 }
      );
    }

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

    // Strip temporary presigned GET query parameters from incoming attachment URLs
    const cleanAttachments = attachments.map((att) => ({
      ...att,
      url: att.url.split("?")[0],
    }));

    // Identify removed attachments to delete from S3 (compare permanent clean S3 URLs)
    const newUrls = new Set(cleanAttachments.map((a) => a.url));
    const removedAttachments = entry.attachments.filter(
      (oldAtt: any) => !newUrls.has(oldAtt.url)
    );

    // Delete removed files from S3 bucket
    for (const attachment of removedAttachments) {
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
          "Failed to delete S3 object on edit update:",
          attachment.url,
          s3Error
        );
      }
    }

    // Save updates (save clean S3 URLs in database)
    entry.title = title;
    entry.content = format === "files" ? "" : content;
    entry.type = type;
    entry.customType = type === "custom" ? customType : undefined;
    entry.format = format;
    entry.tags = tags;
    entry.attachments = cleanAttachments;
    entry.categoryId = category._id;
    entry.workspaceId = category.workspaceId;
    await entry.save();

    // Map and sign attachments dynamically for response output
    const responseAttachments = await signAttachments(cleanAttachments);

    return NextResponse.json({
      success: true,
      data: {
        ...entry.toObject(),
        attachments: responseAttachments,
      },
    });
  } catch (error) {
    console.error("PUT Entry ID Error:", error);
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
            message: "You must be logged in to delete this entry.",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const entry = await Entry.findOne({ _id: id, userId });

    if (!entry) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ENTRY_NOT_FOUND",
            message: "Entry not found or access denied.",
          },
        },
        { status: 404 }
      );
    }

    // Delete all associated files from S3 bucket
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
          "Failed to delete S3 object on entry deletion:",
          attachment.url,
          s3Error
        );
      }
    }

    await Entry.deleteOne({ _id: id, userId });

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error("DELETE Entry ID Error:", error);
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
