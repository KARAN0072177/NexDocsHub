import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { Workspace } from "@/models/Workspace";
import { Category } from "@/models/Category";
import { AppShell } from "@/features/workspace/components/app-shell";

interface CategoryDocument {
  _id: { toString(): string };
  name: string;
  isPinned?: boolean;
}

export default async function Home() {
  // 1. Establish database connection
  await dbConnect();

  // 2. Validate Session
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session")?.value;

  if (!sessionToken) {
    redirect("/login");
  }

  const session = await Session.findOne({ sessionToken }).lean();

  if (!session || session.expiresAt < new Date()) {
    redirect("/login");
  }

  // 3. Resolve User profile
  const user = await User.findById(session.userId).lean();

  if (!user) {
    redirect("/login");
  }

  // 4. Auto-provision Workspace if missing
  let workspace = await Workspace.findOne({ userId: user._id }).lean();
  if (!workspace) {
    const createdWorkspace = await Workspace.create({
      name: `${user.username}'s Workspace`,
      userId: user._id,
    });
    workspace = createdWorkspace.toObject();
  }

  // 5. Fetch Categories
  const categories = await Category.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .lean();

  // 6. Serialize data for React Client Component compatibility
  const plainUser = {
    username: user.username as string,
    email: user.email as string,
  };

  const plainCategories = (categories as CategoryDocument[]).map((cat) => ({
    id: cat._id.toString() as string,
    name: cat.name as string,
    isPinned: !!cat.isPinned,
  }));

  return (
    <AppShell user={plainUser} initialCategories={plainCategories} />
  );
}
