import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { Entry } from "@/models/Entry";
import { Category } from "@/models/Category";

interface SearchAttachment {
  name: string;
}

interface PopulatedCategory {
  _id?: { toString(): string };
  name?: string;
  toString?: () => string;
}

interface SearchEntry {
  _id: { toString(): string };
  title: string;
  type: string;
  customType?: string;
  tags: string[];
  categoryId?: PopulatedCategory;
  format?: "note" | "files";
  content?: string;
  attachments?: SearchAttachment[];
}

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

function escapeRegex(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

function getSnippet(content: string, query: string): string {
  // Strip HTML or Markdown indicators to get plain text snippet
  const text = content
    .replace(/<[^>]*>/g, " ") // Strip HTML tags
    .replace(/[#*`_~[\]()|>-]/g, " ") // Strip raw markdown symbols
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();

  if (!text) return "";

  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) {
    return text.slice(0, 100) + (text.length > 100 ? "..." : "");
  }

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + query.length + 65);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
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
            message: "You must be logged in to search entries.",
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const escapedQuery = escapeRegex(query.trim());
    const regex = new RegExp(escapedQuery, "i");

    // Search query: matching title, tags, content, or attachment names
    const entries = await Entry.find({
      userId,
      $or: [
        { title: regex },
        { tags: regex },
        { content: regex },
        { "attachments.name": regex },
      ],
    })
      .populate({
        path: "categoryId",
        model: Category,
        select: "name",
      })
      .limit(15)
      .lean();

    const searchResults = (entries as SearchEntry[]).map((entry) => {
      const categoryName = entry.categoryId?.name ?? "Uncategorized";
      const categoryId =
        entry.categoryId?._id?.toString() ?? entry.categoryId?.toString?.();

      return {
        id: entry._id.toString(),
        title: entry.title,
        type: entry.type,
        customType: entry.customType,
        tags: entry.tags,
        categoryId,
        categoryName,
        format: entry.format ?? "note",
        snippet: getSnippet(entry.content || "", query),
        // If query matches attachments, flag it
        matchedAttachment: entry.attachments?.find((att) =>
          att.name.toLowerCase().includes(query.toLowerCase())
        )?.name,
      };
    });

    return NextResponse.json({
      success: true,
      data: searchResults,
    });
  } catch (error) {
    console.error("GET Search Error:", error);
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
