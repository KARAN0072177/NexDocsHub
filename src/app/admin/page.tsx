import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
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

  // 4. Serialize database results to plain JSON for Client Component hydration
  const plainUsers = usersList.map((userDoc: any) => ({
    id: userDoc._id.toString(),
    username: userDoc.username || "Unknown",
    email: userDoc.email || "Unknown",
    role: userDoc.role || "user",
    createdAt: userDoc.createdAt ? userDoc.createdAt.toISOString() : null,
  }));

  const plainCurrentUser = {
    username: currentUserRecord.username || "Admin",
    email: currentUserRecord.email || "",
    role: currentUserRecord.role || "admin",
  };

  return (
    <AdminDashboardClient
      initialUsers={plainUsers}
      currentUser={plainCurrentUser}
    />
  );
}
