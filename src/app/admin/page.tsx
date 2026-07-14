import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dbConnect } from "@/lib/db";
import { Session } from "@/models/Session";
import { User } from "@/models/User";
import { IpBan } from "@/models/IpBan";
import { Shield, Users, Activity, Lock, ArrowLeft } from "lucide-react";

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
  const user = await User.findById(session.userId).lean();

  if (!user || user.role !== "admin") {
    // Silently redirect non-admin users so they do not know this route exists
    redirect("/");
  }

  // 3. Gather Dashboard shell stats (real DB queries!)
  const totalUsers = await User.countDocuments();
  const activeSessions = await Session.countDocuments({
    expiresAt: { $gt: new Date() },
  });
  const activeBans = await IpBan.countDocuments();

  return (
    <div className="relative min-h-screen w-full bg-[#05060a] text-white overflow-hidden p-6 md:p-12">
      {/* Background neon blobs */}
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#6C5CE7]/15 blur-[130px] z-0" />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 h-[500px] w-[500px] rounded-full bg-[#22D3EE]/10 blur-[120px] z-0" />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25] z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 50%, transparent 100%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#22D3EE] shadow-[0_0_15px_-3px_rgba(108,92,231,0.5)] text-white">
                <Shield className="h-4 w-4" />
              </span>
              <h1
                className="text-xl font-extrabold tracking-tight"
                style={{ fontFamily: "var(--font-display)" }}
              >
                NexDocsHub Admin
              </h1>
            </div>
            <p className="text-xs text-neutral-500">
              Secured core system administration panel.
            </p>
          </div>
          <a
            href="/"
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] px-4 py-2 text-xs font-semibold text-neutral-400 hover:text-white transition duration-150 self-start sm:self-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </a>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                Total Users
              </span>
              <Users className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-3xl font-extrabold tracking-tight">
              {totalUsers}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                Active Sessions
              </span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold tracking-tight">
              {activeSessions}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">
                IP Address Bans
              </span>
              <Lock className="h-4 w-4 text-rose-400" />
            </div>
            <p className="text-3xl font-extrabold tracking-tight">
              {activeBans}
            </p>
          </div>
        </div>

        {/* Main Workspaces Layout Shell */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Console Panel */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md space-y-5 shadow-lg">
            <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
              System Activity Logs
            </h2>
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-5 space-y-4 font-mono text-[11px] text-emerald-450/90 max-h-[300px] overflow-y-auto">
              <p>&gt; [SYSTEM] NexDocsHub kernel initialized successfully.</p>
              <p>&gt; [DB] MongoDB cluster connected successfully.</p>
              <p>&gt; [SECURITY] IP Ban and rate limiting filters loaded.</p>
              <p>&gt; [AUTH] Admin session established securely.</p>
              <p className="text-neutral-500">&gt; Waiting for next request...</p>
            </div>
          </div>

          {/* Side Control Panel */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md space-y-5 shadow-lg">
            <h2 className="text-sm font-bold text-neutral-200 uppercase tracking-wider">
              System Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 text-xs">
                <span className="text-neutral-400">Admin Lockout Status</span>
                <span className="text-emerald-400 font-semibold">Active</span>
              </div>
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-3 text-xs">
                <span className="text-neutral-450">Bans Escalation Limit</span>
                <span className="text-neutral-300 font-semibold">
                  3 attempts
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-450">Environment Mode</span>
                <span className="text-violet-400 font-semibold">
                  Development
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
