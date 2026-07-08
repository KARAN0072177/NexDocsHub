import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const presignedRequestSchema = z.object({
  filename: z.string().min(1, "Filename is required."),
  contentType: z.string().min(1, "ContentType is required."),
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // 1. Authenticate user
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to upload files.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Parse and validate body
    const body = await request.json();
    const validation = presignedRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Filename and contentType are required.",
            fieldErrors: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { filename, contentType } = validation.data;
    const bucketName = process.env.AWS_BUCKET_NAME!;
    const region = process.env.AWS_REGION!;

    // Clean filename to prevent path traversal or invalid character problems
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `users/${userId}/attachments/${Date.now()}-${cleanFilename}`;

    // 3. Setup S3 PUT command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    // 4. Generate signed upload URL
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    // 5. Generate public file URL
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        fileUrl,
      },
    });
  } catch (error) {
    console.error("Presigned URL Generation Error:", error);
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
