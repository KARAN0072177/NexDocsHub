"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Users,
  Home,
  LogOut,
  ChevronDown,
  ChevronUp,
  Search,
  Mail,
  User as UserIcon,
  Calendar,
} from "lucide-react";

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string | null;
}

interface AdminDashboardClientProps {
  initialUsers: UserItem[];
  currentUser: {
    username: string;
    email: string;
    role: string;
  };
}

export function AdminDashboardClient({
  initialUsers,
  currentUser,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users">("users");
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Filter users based on query
  const filteredUsers = initialUsers.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (response.ok) {
        router.replace("/login");
        router.refresh();
      } else {
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="relative flex min-h-screen w-full bg-[#05060a] text-white overflow-hidden font-sans">
      {/* Background ambient neon glow */}
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#6C5CE7]/10 blur-[130px] z-0" />
      <div className="pointer-events-none absolute -bottom-20 right-1/4 h-[500px] w-[500px] rounded-full bg-[#22D3EE]/05 blur-[120px] z-0" />

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25] z-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage:
            "radial-gradient(ellipse 65% 55% at 50% 45%, black 45%, transparent 100%)",
        }}
      />

      {/* 1. Sidebar Panel */}
      <aside className="relative z-10 flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
        {/* Sidebar Header */}
        <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-6">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#22D3EE] shadow-[0_0_12px_rgba(108,92,231,0.4)] text-white">
            <Shield className="h-4 w-4" />
          </span>
          <span className="font-extrabold text-sm tracking-tight bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
            NexDocsHub Admin
          </span>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1.5 p-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold transition duration-150 ${
              activeTab === "users"
                ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.06]"
                : "text-neutral-450 hover:bg-white/[0.03] hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            Users List
          </button>

          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:bg-white/[0.03] hover:text-white transition duration-150"
          >
            <Home className="h-4 w-4" />
            Home (Dashboard)
          </Link>
        </nav>

        {/* Sidebar Bottom Profile Menu */}
        <div className="relative border-t border-white/[0.06] p-4">
          {/* Toggled Profile Dropdown Info Panel */}
          {profileOpen && (
            <div className="absolute bottom-[80px] left-4 right-4 z-25 rounded-2xl border border-white/[0.1] bg-[#0c0d14] p-4 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8)] backdrop-blur-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="space-y-3.5">
                <div>
                  <span className="block text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                    Administrator
                  </span>
                  <span className="block truncate text-xs font-bold text-white mt-0.5">
                    {currentUser.username}
                  </span>
                </div>

                <div className="border-t border-white/[0.05] pt-2.5 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-neutral-450">
                    <Mail className="h-3 w-3 text-neutral-550 shrink-0" />
                    <span className="truncate">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-450">
                    <Shield className="h-3 w-3 text-violet-400 shrink-0" />
                    <span className="capitalize">{currentUser.role}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {isLoggingOut ? "Logging out..." : "Log Out"}
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Profile Row Toggle Button */}
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition duration-150 ${
              profileOpen
                ? "bg-white/[0.06] border border-white/[0.06]"
                : "hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6C5CE7] to-[#22D3EE] text-[10px] font-extrabold text-white">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </span>
              <span className="truncate text-xs font-bold text-neutral-200">
                {currentUser.username}
              </span>
            </div>
            {profileOpen ? (
              <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5 text-neutral-400" />
            )}
          </button>
        </div>
      </aside>

      {/* 2. Main content area */}
      <main className="relative z-10 flex h-screen flex-1 flex-col overflow-y-auto p-8 md:p-10">
        {/* Users Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold tracking-tight">
              Users Directory
            </h2>
            <p className="text-xs text-neutral-400">
              Manage system access and review user registrations.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by username, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-550 focus:border-white/[0.15] focus:bg-white/[0.04] focus:outline-none transition"
            />
          </div>
        </div>

        {/* Users Content Container */}
        <div className="mt-8 flex-1">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.01] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4 text-center">Role</th>
                    <th className="px-6 py-4 text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-white/[0.02] transition duration-100"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04] text-neutral-350">
                              <UserIcon className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-bold text-white">
                              {user.username}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-400 font-mono">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                              user.role === "admin"
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : "bg-cyan-500/10 text-cyan-450 border-cyan-500/20"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-neutral-450 font-mono">
                          <span className="flex items-center justify-end gap-1.5">
                            <Calendar className="h-3 w-3 text-neutral-550" />
                            {formatDate(user.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-12 text-center text-xs text-neutral-500"
                      >
                        No users match your search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
