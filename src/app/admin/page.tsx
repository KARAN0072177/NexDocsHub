import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { AuthLog } from "@/models/AuthLog";
import { Entry } from "@/models/Entry";
import { AdminDashboardClient } from "./admin-dashboard-client";

export default async function AdminDashboard() {
  await dbConnect();

  // 1. Validate Session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const session = await Session.findOne({ sessionToken }).lean();

  if (!session || session.expiresAt < new Date()) {
    redirect("/login");
  }

  // 2. Validate Admin Authorization
  const currentUserRecord = await User.findById(session.userId).lean();

  if (!currentUserRecord || currentUserRecord.role !== "admin") {
    // Silently redirect non-admin users so they do not know this route exists
    redirect("/");
  }

  // 3. Fetch All Registered Users (excluding sensitive passwords)
  const usersList = await User.find({}, { passwordHash: 0 })
    .sort({ createdAt: -1 })
    .lean();

  // 4. Fetch Recent Auth Logs (limit to 100 recent events)
  const logsList = await AuthLog.find()
    .sort({ timestamp: -1 })
    .limit(100)
    .lean();

  // 5. Query all entries with attachments to compile S3 storage records
  const entriesWithAttachments = await Entry.find({
    "attachments.0": { $exists: true },
  })
    .populate("userId", "username email")
    .sort({ createdAt: -1 })
    .lean();

  // 6. Serialize database results to plain JSON for Client Component hydration
  const plainUsers = usersList.map((userDoc: any) => ({
    id: userDoc._id.toString(),
    username: userDoc.username || "Unknown",
    email: userDoc.email || "Unknown",
    role: userDoc.role || "user",
    createdAt: userDoc.createdAt ? userDoc.createdAt.toISOString() : null,
  }));

  const plainLogs = logsList.map((logDoc: any) => ({
    id: logDoc._id.toString(),
    action: logDoc.action,
    email: logDoc.email || "",
    ipAddress: logDoc.ipAddress,
    userAgent: logDoc.userAgent || "",
    status: logDoc.status,
    reason: logDoc.reason || "",
    timestamp: logDoc.timestamp ? logDoc.timestamp.toISOString() : null,
  }));

  const plainFiles: any[] = [];
  for (const entry of entriesWithAttachments) {
    const owner = entry.userId
      ? {
          id: (entry.userId as any)._id.toString(),
          username: (entry.userId as any).username || "Unknown",
          email: (entry.userId as any).email || "Unknown",
        }
      : { id: "", username: "Unknown", email: "" };

    if (entry.attachments && Array.isArray(entry.attachments)) {
      for (const attachment of entry.attachments) {
        plainFiles.push({
          id: attachment._id
            ? attachment._id.toString()
            : Math.random().toString(),
          name: attachment.name,
          url: attachment.url,
          mimeType: attachment.mimeType,
          size: attachment.size,
          owner,
          entryTitle: entry.title,
          uploadedAt: entry.createdAt ? entry.createdAt.toISOString() : null,
        });
      }
    }
  }

  const plainCurrentUser = {
    username: currentUserRecord.username || "Admin",
    email: currentUserRecord.email || "",
    role: currentUserRecord.role || "admin",
  };

  const s3Config = {
    bucketName: process.env.AWS_BUCKET_NAME || "Not Configured",
    region: process.env.AWS_REGION || "Not Configured",
    active: !!(
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ),
  };

  return (
    <AdminDashboardClient
      initialUsers={plainUsers}
      initialLogs={plainLogs}
      initialFiles={plainFiles}
      currentUser={plainCurrentUser}
      s3Config={s3Config}
    />
  );
}
