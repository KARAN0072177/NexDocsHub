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
  Terminal,
  AlertTriangle,
  Smartphone,
  Monitor,
  Download,
  ChevronLeft,
  ChevronRight,
  HardDrive,
} from "lucide-react";

interface UserItem {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string | null;
}

interface LogItem {
  id: string;
  action: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  status: string;
  reason: string;
  timestamp: string | null;
}

interface FileItem {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  owner: {
    id: string;
    username: string;
    email: string;
  };
  entryTitle: string;
  uploadedAt: string | null;
}

interface AdminDashboardClientProps {
  initialUsers: UserItem[];
  initialLogs: LogItem[];
  initialFiles: FileItem[];
  currentUser: {
    username: string;
    email: string;
    role: string;
  };
  s3Config: {
    bucketName: string;
    region: string;
    active: boolean;
  };
}

function parseUserAgent(ua: string) {
  if (!ua)
    return { device: "desktop", label: "Unknown Device", browser: "Unknown" };

  const lowercase = ua.toLowerCase();
  let device: "desktop" | "mobile" = "desktop";
  let os = "Unknown OS";
  let browser = "Browser";

  // Identify mobile vs desktop
  if (
    lowercase.includes("mobi") ||
    lowercase.includes("iphone") ||
    lowercase.includes("android") ||
    lowercase.includes("ipad")
  ) {
    device = "mobile";
  }

  // Parse Operating System (checking mobile OS first to prevent false matches)
  if (lowercase.includes("android")) {
    os = "Android";
  } else if (lowercase.includes("iphone") || lowercase.includes("ipad")) {
    os = "iOS";
  } else if (lowercase.includes("windows")) {
    os = "Windows";
  } else if (
    lowercase.includes("macintosh") ||
    lowercase.includes("mac os") ||
    lowercase.includes("mac os x")
  ) {
    os = "macOS";
  } else if (lowercase.includes("linux")) {
    os = "Linux";
  }

  // Parse Browser name
  if (lowercase.includes("edg") || lowercase.includes("edge")) {
    browser = "Edge";
  } else if (lowercase.includes("chrome") || lowercase.includes("crios")) {
    browser = "Chrome";
  } else if (
    lowercase.includes("safari") &&
    !lowercase.includes("chrome") &&
    !lowercase.includes("crios")
  ) {
    browser = "Safari";
  } else if (lowercase.includes("firefox") || lowercase.includes("fxios")) {
    browser = "Firefox";
  }

  return { device, label: `${os} • ${browser}` };
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function maskFilename(name: string) {
  if (!name) return "encrypted_file";
  const parts = name.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()}` : "";
  const base = parts.join(".");

  // Generate deterministic hash of base name
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return `enc_file_${hex}${ext}`;
}

function getPercentageString(size: number, total: number) {
  if (!total || size === 0) return "0%";
  const pct = (size / total) * 100;
  if (pct > 0 && pct < 0.1) return "< 0.1%";
  if (pct > 99.9 && pct < 100) return "> 99.9%";
  return `${pct.toFixed(1)}%`;
}

function ShimmerSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <tr key={idx} className="animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <td key={cIdx} className="px-6 py-4.5">
              <div className="h-3 rounded bg-white/[0.06] w-3/4" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function AdminDashboardClient({
  initialUsers,
  initialLogs,
  initialFiles,
  currentUser,
  s3Config,
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "logs" | "storage">(
    "users"
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // 1. Group failed logs by IP to flag suspicious behaviors
  const ipFailuresCount: Record<string, number> = {};
  initialLogs.forEach((log) => {
    if (log.status === "failed") {
      ipFailuresCount[log.ipAddress] =
        (ipFailuresCount[log.ipAddress] || 0) + 1;
    }
  });

  const suspiciousIps = Object.keys(ipFailuresCount).filter(
    (ip) => ipFailuresCount[ip] >= 3
  );
  const suspiciousIpsCount = suspiciousIps.length;

  // Filter users based on query
  const filteredUsers = initialUsers.filter((user) => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  // Filter logs based on query
  const filteredLogs = initialLogs.filter((log) => {
    const query = searchQuery.toLowerCase();
    const parsedUA = parseUserAgent(log.userAgent);
    const isSuspicious = ipFailuresCount[log.ipAddress] >= 3;
    return (
      log.action.toLowerCase().includes(query) ||
      log.email.toLowerCase().includes(query) ||
      log.ipAddress.toLowerCase().includes(query) ||
      log.status.toLowerCase().includes(query) ||
      log.reason.toLowerCase().includes(query) ||
      parsedUA.label.toLowerCase().includes(query) ||
      (isSuspicious && query.includes("suspicious"))
    );
  });

  // Filter files based on query (filtering on masked name for privacy)
  const filteredFiles = initialFiles.filter((file) => {
    const query = searchQuery.toLowerCase();
    const maskedName = maskFilename(file.name).toLowerCase();
    return (
      maskedName.includes(query) ||
      file.mimeType.toLowerCase().includes(query) ||
      file.owner.username.toLowerCase().includes(query) ||
      file.owner.email.toLowerCase().includes(query)
    );
  });

  // Paginated Data
  const totalItems =
    activeTab === "users"
      ? filteredUsers.length
      : activeTab === "logs"
      ? filteredLogs.length
      : filteredFiles.length;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;

  const currentUsers = filteredUsers.slice(startIndex, startIndex + pageSize);
  const currentLogs = filteredLogs.slice(startIndex, startIndex + pageSize);
  const currentFiles = filteredFiles.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsTransitioning(false);
    }, 300); // Shimmer transition speed
  };

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

  const exportToCSV = () => {
    const headers = [
      "Action",
      "Email",
      "IP Address",
      "User Agent",
      "Status",
      "Reason",
      "Timestamp",
      "Flagged Suspicious",
    ];
    const rows = initialLogs.map((log) => [
      log.action,
      log.email,
      log.ipAddress,
      log.userAgent.replace(/"/g, '""'), // escape quotes
      log.status,
      log.reason,
      log.timestamp,
      ipFailuresCount[log.ipAddress] >= 3 ? "TRUE" : "FALSE",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((val) => `"${val || ""}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `auth-logs-${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Stats Calculations for Users tab
  const totalUsersCount = initialUsers.length;
  const regularUsersCount = initialUsers.filter((u) => u.role === "user")
    .length;
  const adminsCount = initialUsers.filter((u) => u.role === "admin").length;
  const joinedThisMonthCount = initialUsers.filter((u) => {
    if (!u.createdAt) return false;
    const date = new Date(u.createdAt);
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;

  // Stats Calculations for Logs tab
  const totalEventsCount = initialLogs.length;
  const successLoginsCount = initialLogs.filter(
    (l) => l.action === "login" && l.status === "success"
  ).length;
  const failedAttemptsCount = initialLogs.filter(
    (l) => l.status === "failed"
  ).length;
  const newRegistrationsCount = initialLogs.filter(
    (l) => l.action === "register" && l.status === "success"
  ).length;

  // Traffic breakdown ratios (Mobile vs Desktop)
  const totalWithUA = initialLogs.filter((l) => l.userAgent).length;
  const mobileCount = initialLogs.filter(
    (l) => parseUserAgent(l.userAgent).device === "mobile"
  ).length;
  const desktopCount = totalWithUA - mobileCount;
  const mobilePercentage = totalWithUA
    ? Math.round((mobileCount / totalWithUA) * 100)
    : 0;
  const desktopPercentage = totalWithUA
    ? Math.round((desktopCount / totalWithUA) * 100)
    : 0;

  // Storage Stats calculations
  const totalFilesCount = initialFiles.length;
  const totalStorageSize = initialFiles.reduce((acc, f) => acc + f.size, 0);

  const largestFile = initialFiles.reduce(
    (prev, current) => (prev.size > current.size ? prev : current),
    { name: "None", size: 0 }
  );

  // File MIME Type breakdown ratios
  const imagesFiles = initialFiles.filter((f) => f.mimeType.startsWith("image/"));
  const pdfFiles = initialFiles.filter((f) => f.mimeType === "application/pdf");
  const zipFiles = initialFiles.filter(
    (f) =>
      f.name.endsWith(".zip") ||
      f.name.endsWith(".rar") ||
      f.name.endsWith(".tar") ||
      f.name.endsWith(".gz")
  );

  const imagesSize = imagesFiles.reduce((acc, f) => acc + f.size, 0);
  const pdfSize = pdfFiles.reduce((acc, f) => acc + f.size, 0);
  const zipSize = zipFiles.reduce((acc, f) => acc + f.size, 0);
  const otherSize = totalStorageSize - (imagesSize + pdfSize + zipSize);

  // Exact strings formatting for percentage display
  const imagesPercentageStr = getPercentageString(imagesSize, totalStorageSize);
  const pdfPercentageStr = getPercentageString(pdfSize, totalStorageSize);
  const zipPercentageStr = getPercentageString(zipSize, totalStorageSize);
  const otherPercentageStr = getPercentageString(otherSize, totalStorageSize);

  // Raw Pct decimals for progress bar widths
  const imagesPctNum = totalStorageSize ? (imagesSize / totalStorageSize) * 100 : 0;
  const pdfPctNum = totalStorageSize ? (pdfSize / totalStorageSize) * 100 : 0;
  const zipPctNum = totalStorageSize ? (zipSize / totalStorageSize) * 100 : 0;
  const otherPctNum = totalStorageSize ? (otherSize / totalStorageSize) * 100 : 0;

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
            onClick={() => {
              setActiveTab("users");
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold transition duration-150 ${
              activeTab === "users"
                ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.06]"
                : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
            }`}
          >
            <Users className="h-4 w-4" />
            Users List
          </button>

          <button
            onClick={() => {
              setActiveTab("logs");
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold transition duration-150 ${
              activeTab === "logs"
                ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.06]"
                : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
            }`}
          >
            <Terminal className="h-4 w-4" />
            Auth Logs
          </button>

          <button
            onClick={() => {
              setActiveTab("storage");
              setSearchQuery("");
              setCurrentPage(1);
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold transition duration-150 ${
              activeTab === "storage"
                ? "bg-white/[0.06] text-white shadow-sm border border-white/[0.06]"
                : "text-neutral-400 hover:bg-white/[0.03] hover:text-white"
            }`}
          >
            <HardDrive className="h-4 w-4" />
            Storage S3
          </button>

          <Link
            href="/"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold text-neutral-455 hover:bg-white/[0.03] hover:text-white transition duration-150"
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
                    <Mail className="h-3 w-3 text-neutral-555 shrink-0" />
                    <span className="truncate">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-450">
                    <Shield className="h-3 w-3 text-violet-405 shrink-0" />
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold tracking-tight">
              {activeTab === "users"
                ? "Users Directory"
                : activeTab === "logs"
                ? "Authentication Logs"
                : "Storage Directory (AWS S3)"}
            </h2>
            <p className="text-xs text-neutral-400">
              {activeTab === "users"
                ? "Manage system access and review user registrations."
                : activeTab === "logs"
                ? "Monitor authentication events, logins, registrations, and lockouts."
                : "Track attachment files, storage size metrics, and AWS integrations."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* CSV export button */}
            {activeTab === "logs" && (
              <button
                onClick={exportToCSV}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition duration-150"
              >
                <Download className="h-3.5 w-3.5 text-neutral-450" />
                Export CSV
              </button>
            )}

            {/* Search bar */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder={
                  activeTab === "users"
                    ? "Search users..."
                    : activeTab === "logs"
                    ? "Search logs..."
                    : "Search encrypted files..."
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-550 focus:border-white/[0.15] focus:bg-white/[0.04] focus:outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Statistics Display Sub-Grid */}
        {activeTab === "users" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                Total Users
              </span>
              <p className="text-xl font-extrabold tracking-tight">
                {totalUsersCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                Regular Accounts
              </span>
              <p className="text-xl font-extrabold tracking-tight text-cyan-400">
                {regularUsersCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                System Admins
              </span>
              <p className="text-xl font-extrabold tracking-tight text-purple-400">
                {adminsCount}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
              <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                Joined This Month
              </span>
              <p className="text-xl font-extrabold tracking-tight text-emerald-400">
                {joinedThisMonthCount}
              </p>
            </div>
          </div>
        ) : activeTab === "logs" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Total Events
                </span>
                <p className="text-xl font-extrabold tracking-tight">
                  {totalEventsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Successful Logins
                </span>
                <p className="text-xl font-extrabold tracking-tight text-emerald-400">
                  {successLoginsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Failed Attempts
                </span>
                <p className="text-xl font-extrabold tracking-tight text-red-400">
                  {failedAttemptsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  New Registrations
                </span>
                <p className="text-xl font-extrabold tracking-tight text-cyan-400">
                  {newRegistrationsCount}
                </p>
              </div>
            </div>

            {/* Traffic Ratio & Security Alert Widget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Traffic Ratio Progress Bar */}
              <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-md space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                    Device Traffic Breakdown
                  </span>
                  <div className="flex gap-4 text-[10px] font-bold text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                      Desktop ({desktopPercentage}%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Mobile ({mobilePercentage}%)
                    </span>
                  </div>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
                    style={{ width: `${desktopPercentage}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${mobilePercentage}%` }}
                  />
                </div>
              </div>

              {/* Suspicious behavior indicator */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-md flex items-center justify-between shadow-md">
                <div className="space-y-1">
                  <span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                    Flagged IPs (Suspicious)
                  </span>
                  <p className="text-xl font-extrabold tracking-tight text-red-400">
                    {suspiciousIpsCount}
                  </p>
                </div>
                <div
                  className={`p-2.5 rounded-xl border transition ${
                    suspiciousIpsCount > 0
                      ? "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
                      : "bg-white/[0.02] border-white/[0.08] text-neutral-500"
                  }`}
                  title={
                    suspiciousIpsCount > 0
                      ? "Warning: IPs detected with 3+ authentication failures"
                      : "No security issues detected"
                  }
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Storage metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Total Attachments
                </span>
                <p className="text-xl font-extrabold tracking-tight">
                  {totalFilesCount}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Storage Used
                </span>
                <p className="text-xl font-extrabold tracking-tight text-violet-400">
                  {formatBytes(totalStorageSize)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Largest File
                </span>
                <p
                  className="text-xs font-extrabold truncate text-amber-450 mt-1.5"
                  title={largestFile.name !== "None" ? "File name masked for privacy" : "None"}
                >
                  {largestFile.name !== "None" ? maskFilename(largestFile.name) : "None"} ({formatBytes(largestFile.size)})
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  Est. Monthly Cost
                </span>
                <p className="text-xl font-extrabold tracking-tight text-cyan-400">
                  {((totalStorageSize / (1024 * 1024 * 1024)) * 0.023) === 0 ? "$0.00" : ((totalStorageSize / (1024 * 1024 * 1024)) * 0.023) < 0.0001 ? `$${((totalStorageSize / (1024 * 1024 * 1024)) * 0.023).toFixed(6)}` : `$${((totalStorageSize / (1024 * 1024 * 1024)) * 0.023).toFixed(4)}`}
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 backdrop-blur-md space-y-1">
                <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  S3 Status
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      s3Config.active ? "bg-emerald-450" : "bg-red-400"
                    }`}
                  />
                  <span
                    className={`text-xs font-bold ${
                      s3Config.active ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {s3Config.active ? "Active" : "Error"}
                  </span>
                </div>
              </div>
            </div>

            {/* S3 Details & Storage breakdown progress bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Size breakdown progress bar */}
              <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-md space-y-4 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                    Storage Usage Breakdown
                  </span>
                  <div className="flex flex-wrap gap-3.5 text-[9px] font-bold text-neutral-450">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      Images ({imagesPercentageStr})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                      PDFs ({pdfPercentageStr})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Archives ({zipPercentageStr})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-neutral-500" />
                      Others ({otherPercentageStr})
                    </span>
                  </div>
                </div>
                <div className="relative h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden flex">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${imagesPctNum}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-500"
                    style={{ width: `${pdfPctNum}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                    style={{ width: `${zipPctNum}%` }}
                  />
                  <div
                    className="h-full bg-neutral-600 transition-all duration-500"
                    style={{ width: `${otherPctNum}%` }}
                  />
                </div>
              </div>

              {/* Bucket details Card */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-md space-y-3.5 text-xs shadow-md">
                <span className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                  AWS Config Details
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-1.5">
                    <span className="text-neutral-450">S3 Bucket</span>
                    <span
                      className="font-mono text-[10px] text-neutral-200 truncate max-w-[120px]"
                      title={s3Config.bucketName}
                    >
                      {s3Config.bucketName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-450">AWS Region</span>
                    <span className="font-mono text-[10px] text-neutral-200">
                      {s3Config.region}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Table Container */}
        <div className="mt-6 flex-1">
          {/* Top Pagination Row & Records Per Page */}
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-neutral-400">
            {/* Records per page selection */}
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-white focus:border-white/[0.15] focus:outline-none transition cursor-pointer"
              >
                <option value="5" className="bg-[#0c0d14] text-white">
                  5
                </option>
                <option value="10" className="bg-[#0c0d14] text-white">
                  10
                </option>
                <option value="50" className="bg-[#0c0d14] text-white">
                  50
                </option>
              </select>
              <span>records per page</span>
            </div>

            {/* Page indicator & pagination buttons */}
            <div className="flex items-center gap-4">
              <span>
                Showing{" "}
                <span className="font-semibold text-neutral-350">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-neutral-350">
                  {Math.min(startIndex + pageSize, totalItems)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-neutral-350">
                  {totalItems}
                </span>{" "}
                entries
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isTransitioning}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-neutral-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pNum = idx + 1;
                    return (
                      <button
                        key={pNum}
                        onClick={() => handlePageChange(pNum)}
                        disabled={isTransitioning}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-semibold transition ${
                          currentPage === pNum
                            ? "bg-white/[0.06] border-white/[0.1] text-white shadow-sm"
                            : "border-transparent text-neutral-455 hover:bg-white/[0.03] hover:text-white"
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || isTransitioning}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-neutral-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
            {activeTab === "users" ? (
              /* Users Table */
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
                    {isTransitioning ? (
                      <ShimmerSkeleton cols={4} />
                    ) : currentUsers.length > 0 ? (
                      currentUsers.map((user) => (
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
                          <td className="px-6 py-4 text-right text-neutral-455 font-mono">
                            <span className="flex items-center justify-end gap-1.5">
                              <Calendar className="h-3 w-3 text-neutral-555" />
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
            ) : activeTab === "logs" ? (
              /* Auth Logs Table */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.01] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Device / Client</th>
                      <th className="px-6 py-4">IP Address</th>
                      <th className="px-6 py-4">Status / Details</th>
                      <th className="px-6 py-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {isTransitioning ? (
                      <ShimmerSkeleton cols={6} />
                    ) : currentLogs.length > 0 ? (
                      currentLogs.map((log) => {
                        const parsedUA = parseUserAgent(log.userAgent);
                        const isSuspicious =
                          ipFailuresCount[log.ipAddress] >= 3;
                        return (
                          <tr
                            key={log.id}
                            className={`transition duration-100 ${
                              isSuspicious
                                ? "bg-red-500/[0.02] hover:bg-red-500/[0.04]"
                                : "hover:bg-white/[0.02]"
                            }`}
                          >
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                                  log.status === "failed"
                                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                                    : log.action === "logout"
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    log.status === "failed"
                                      ? "bg-red-400"
                                      : log.action === "logout"
                                      ? "bg-blue-400"
                                      : "bg-emerald-400"
                                  }`}
                                />
                                {log.action.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-neutral-200 font-medium">
                              {log.email || (
                                <span className="text-neutral-600">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-neutral-300">
                                {parsedUA.device === "mobile" ? (
                                  <Smartphone className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                ) : (
                                  <Monitor className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                )}
                                <span
                                  className="text-[11px] truncate max-w-[140px] font-medium"
                                  title={log.userAgent || "Unknown Client"}
                                >
                                  {parsedUA.label}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`${
                                    isSuspicious
                                      ? "text-red-450 font-bold"
                                      : "text-neutral-400"
                                  }`}
                                >
                                  {log.ipAddress}
                                </span>
                                {isSuspicious && (
                                  <span
                                    className="inline-flex rounded bg-red-500/15 border border-red-500/30 px-1 py-0.2 text-[8px] font-extrabold uppercase text-red-400 animate-pulse"
                                    title={`Suspicious behavior: ${
                                      ipFailuresCount[log.ipAddress]
                                    } total authentication failures from this IP address`}
                                  >
                                    Flagged
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {log.status === "failed" ? (
                                <span className="text-red-400/90 font-medium flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                  {log.reason}
                                </span>
                              ) : (
                                <span className="text-neutral-500 font-medium">
                                  Success
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right text-neutral-455 font-mono">
                              {log.timestamp
                                ? new Date(log.timestamp).toLocaleString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    }
                                  )
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-xs text-neutral-500"
                        >
                          No authentication logs match your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Storage Table (Masked for Privacy) */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-white/[0.01] text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      <th className="px-6 py-4">File Object (Encrypted ID)</th>
                      <th className="px-6 py-4">File Size</th>
                      <th className="px-6 py-4">MIME Type</th>
                      <th className="px-6 py-4">Uploaded By</th>
                      <th className="px-6 py-4 text-right">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs">
                    {isTransitioning ? (
                      <ShimmerSkeleton cols={5} />
                    ) : currentFiles.length > 0 ? (
                      currentFiles.map((file) => (
                        <tr
                          key={file.id}
                          className="hover:bg-white/[0.02] transition duration-100"
                        >
                          <td className="px-6 py-4 font-mono text-neutral-300">
                            {maskFilename(file.name)}
                          </td>
                          <td className="px-6 py-4 text-neutral-200 font-mono">
                            {formatBytes(file.size)}
                          </td>
                          <td className="px-6 py-4 text-neutral-450 font-mono">
                            {file.mimeType}
                          </td>
                          <td className="px-6 py-4 text-neutral-400">
                            <div>
                              <p className="font-bold">
                                {file.owner.username}
                              </p>
                              <p className="text-[10px] text-neutral-550">
                                {file.owner.email}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-neutral-455 font-mono font-medium">
                            {formatDate(file.uploadedAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-xs text-neutral-500"
                        >
                          No storage attachments match your search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-4 text-xs text-neutral-500">
              <span />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isTransitioning}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-neutral-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => handlePageChange(pNum)}
                      disabled={isTransitioning}
                      className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-semibold transition ${
                        currentPage === pNum
                          ? "bg-white/[0.06] border-white/[0.1] text-white shadow-sm"
                          : "border-transparent text-neutral-455 hover:bg-white/[0.03] hover:text-white"
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isTransitioning}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-neutral-400 hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
