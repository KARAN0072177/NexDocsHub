"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText,
  BookOpen,
  Scale,
  TrendingUp,
  Bug,
  Search,
  Bookmark,
  Users,
  PenTool,
  Paperclip,
  Plus,
  Tag,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  Download,
} from "lucide-react";
import { exportEntryToPDF } from "../utils/export-pdf";

interface Attachment {
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface Entry {
  _id: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  attachments: Attachment[];
  categoryId: string;
  createdAt: string;
  updatedAt: string;
  customType?: string;
  format?: "note" | "files";
}

interface EntryListProps {
  categoryId: string;
  categoryName: string;
  onCreateEntry: () => void;
  onSelectEntry: (entry: Entry) => void;
}

export const typeConfig: Record<
  string,
  { label: string; icon: any; color: string; dot: string; glow: string }
> = {
  learning_day: {
    label: "Learning Day",
    icon: BookOpen,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    dot: "bg-amber-400",
    glow: "shadow-amber-500/10",
  },
  architecture_decision: {
    label: "Architecture Decision",
    icon: Scale,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    dot: "bg-blue-400",
    glow: "shadow-blue-500/10",
  },
  project_progress: {
    label: "Project Progress",
    icon: TrendingUp,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    dot: "bg-emerald-400",
    glow: "shadow-emerald-500/10",
  },
  debugging_log: {
    label: "Debugging Log",
    icon: Bug,
    color: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    dot: "bg-rose-400",
    glow: "shadow-rose-500/10",
  },
  research_note: {
    label: "Research Note",
    icon: Search,
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    dot: "bg-purple-400",
    glow: "shadow-purple-500/10",
  },
  reference: {
    label: "Reference",
    icon: Bookmark,
    color: "text-teal-400 bg-teal-400/10 border-teal-400/20",
    dot: "bg-teal-400",
    glow: "shadow-teal-500/10",
  },
  meeting_note: {
    label: "Meeting Note",
    icon: Users,
    color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    dot: "bg-indigo-400",
    glow: "shadow-indigo-500/10",
  },
  documentation: {
    label: "Documentation",
    icon: FileText,
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    dot: "bg-sky-400",
    glow: "shadow-sky-500/10",
  },
  journal: {
    label: "Journal",
    icon: PenTool,
    color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
    dot: "bg-pink-400",
    glow: "shadow-pink-500/10",
  },
  custom: {
    label: "Custom",
    icon: FileText,
    color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    dot: "bg-orange-400",
    glow: "shadow-orange-500/10",
  },
};

const fallbackConfig = {
  label: "Entry",
  icon: FileText,
  color: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  dot: "bg-orange-400",
  glow: "shadow-orange-500/10",
};

function groupByDay(entries: Entry[]) {
  const groups: { key: string; label: string; entries: Entry[] }[] = [];
  const map = new Map<string, Entry[]>();

  for (const entry of entries) {
    const d = new Date(entry.createdAt);
    const key = d.toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  for (const [key, list] of map.entries()) {
    let label = key;
    if (key === today) label = "Today";
    else if (key === yesterday) label = "Yesterday";
    else
      label = new Date(list[0].createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    groups.push({ key, label, entries: list });
  }

  return groups;
}

export function EntryList({
  categoryId,
  categoryName,
  onCreateEntry,
  onSelectEntry,
}: EntryListProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTypes, setActiveTypes] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showTypeFilter, setShowTypeFilter] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchEntries() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/entries?categoryId=${categoryId}`);
        const result = await response.json();
        if (!cancelled) {
          if (response.ok && result.success) {
            setEntries(result.data);
          } else {
            setError(true);
          }
        }
      } catch (err) {
        console.error("Failed to load entries:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEntries();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  const presentTypes = useMemo(() => {
    const set = new Set(entries.map((e) => e.type));
    return Array.from(set);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    const result = entries.filter((entry) => {
      const matchesQuery =
        !query ||
        entry.title.toLowerCase().includes(query) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        (typeConfig[entry.type]?.label || "").toLowerCase().includes(query);

      const matchesType =
        activeTypes.length === 0 || activeTypes.includes(entry.type);

      return matchesQuery && matchesType;
    });

    result.sort((a, b) => {
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? -diff : diff;
    });

    return result;
  }, [entries, searchQuery, activeTypes, sortOrder]);

  const groups = useMemo(
    () => groupByDay(filteredEntries),
    [filteredEntries]
  );

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  const toggleType = (type: string) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const hasActiveFilters = searchQuery.trim() !== "" || activeTypes.length > 0;

  const clearFilters = () => {
    setSearchQuery("");
    setActiveTypes([]);
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden font-[var(--font-body)]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

        :root {
          --font-display: 'Space Grotesk', sans-serif;
          --font-body: 'Inter', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, rgba(255,255,255,0.015) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.015) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s infinite linear;
        }
        .shimmer-block {
          background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s infinite linear;
        }

        @keyframes entryIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .entry-card {
          animation: entryIn 0.32s ease-out backwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .shimmer-bg, .shimmer-block, .entry-card {
            animation: none !important;
          }
        }

        .glass-focus:focus-visible {
          outline: 2px solid rgba(96, 165, 250, 0.6);
          outline-offset: 2px;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1
            className="text-[26px] font-semibold text-white tracking-tight leading-none truncate"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {categoryName}
          </h1>
          {!loading && (
            <p
              className="mt-2 text-[11px] text-neutral-500 tracking-wide"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {entries.length} {entries.length === 1 ? "entry" : "entries"}
              {hasActiveFilters &&
                ` · ${filteredEntries.length} shown`}
            </p>
          )}
        </div>
        <button
          onClick={onCreateEntry}
          className="glass-focus flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-lg shadow-blue-950/40 hover:shadow-blue-500/20 hover:-translate-y-0.5 duration-200 active:translate-y-0"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span>New Entry</span>
        </button>
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="w-full rounded-xl border border-white/[0.06] shimmer-bg h-[42px] mb-5" />
          <div className="flex-1 space-y-3 pr-1 overflow-hidden">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5 h-[106px] shimmer-bg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="h-4 w-[45%] rounded-md shimmer-block" />
                    <div className="h-3.5 w-[20%] rounded-md shimmer-block opacity-70" />
                  </div>
                  <div className="h-6 w-24 rounded-full shimmer-block" />
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="h-4 w-12 rounded-md shimmer-block opacity-60" />
                  <div className="h-4 w-14 rounded-md shimmer-block opacity-60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        /* Error state */
        <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] text-rose-400 mb-6">
            <Bug className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-white text-base" style={{ fontFamily: "var(--font-display)" }}>
            Couldn't load entries
          </h3>
          <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
            Something went wrong reaching the server. Check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="glass-focus mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          {entries.length > 0 && (
            <div className="mb-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <SlidersHorizontal className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
                  <input
                    type="text"
                    placeholder="Filter by title, type, or tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-focus w-full rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm py-2.5 pl-10 pr-4 text-xs text-white outline-none placeholder:text-neutral-700 focus:border-white/[0.14] focus:bg-white/[0.05] transition"
                  />
                </div>

                <button
                  onClick={() => setShowTypeFilter((v) => !v)}
                  aria-pressed={showTypeFilter}
                  className={`glass-focus flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                    activeTypes.length > 0
                      ? "border-blue-400/30 bg-blue-400/10 text-blue-300"
                      : "border-white/[0.07] bg-white/[0.03] text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {activeTypes.length > 0 && (
                    <span style={{ fontFamily: "var(--font-mono)" }}>
                      {activeTypes.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() =>
                    setSortOrder((s) => (s === "newest" ? "oldest" : "newest"))
                  }
                  className="glass-focus flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05] transition"
                  title={sortOrder === "newest" ? "Newest first" : "Oldest first"}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {showTypeFilter && (
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                  {presentTypes.map((type) => {
                    const config = typeConfig[type] || fallbackConfig;
                    const active = activeTypes.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={`glass-focus flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition ${
                          active
                            ? config.color
                            : "text-neutral-500 bg-white/[0.02] border-white/[0.06] hover:text-neutral-300"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                        {config.label}
                      </button>
                    );
                  })}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="glass-focus flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-neutral-500 hover:text-white transition"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Timeline */}
          {filteredEntries.length > 0 ? (
            <div className="flex-1 overflow-y-auto pr-1 -mr-1">
              {groups.map((group, groupIdx) => (
                <div key={group.key} className="mb-6 last:mb-2">
                  <div
                    className="sticky top-0 z-10 -mx-1 mb-3 flex items-center gap-2 bg-gradient-to-b from-neutral-950 via-neutral-950/95 to-transparent px-1 py-1.5 backdrop-blur-sm"
                  >
                    <span
                      className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-neutral-500"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {group.label}
                    </span>
                    <div className="h-px flex-1 bg-white/[0.06]" />
                  </div>

                  <div className="relative space-y-2.5 pl-5">
                    {/* Rail */}
                    <div className="absolute left-[5px] top-1 bottom-1 w-px bg-gradient-to-b from-white/[0.12] via-white/[0.06] to-transparent" />

                    {group.entries.map((entry, i) => {
                      const config = typeConfig[entry.type] || fallbackConfig;
                      const Icon = config.icon;

                      return (
                        <div key={entry._id} className="relative">
                          {/* Node */}
                          <span
                            className={`absolute -left-5 top-6 h-2.5 w-2.5 rounded-full ring-4 ring-neutral-950 ${config.dot}`}
                          />

                          <div
                            onClick={() => onSelectEntry(entry)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectEntry(entry);
                              }
                            }}
                            role="button"
                            tabIndex={0}
                            style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                            className={`entry-card glass-focus group flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] backdrop-blur-md hover:bg-white/[0.045] hover:border-white/[0.11] p-5 transition-all duration-200 cursor-pointer select-none shadow-lg ${config.glow} hover:-translate-y-0.5 hover:shadow-xl`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <h2
                                  className="text-[13.5px] font-semibold text-neutral-200 group-hover:text-white transition leading-snug truncate"
                                  style={{ fontFamily: "var(--font-display)" }}
                                >
                                  {entry.title}
                                </h2>
                                <div
                                  className="flex flex-wrap items-center gap-2 text-[10.5px] text-neutral-600"
                                  style={{ fontFamily: "var(--font-mono)" }}
                                >
                                  <span>{formatTime(entry.createdAt)}</span>
                                  {entry.attachments.length > 0 && (
                                    <span className="flex items-center gap-1 text-neutral-500">
                                      <Paperclip className="h-3 w-3" />
                                      {entry.attachments.length}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span
                                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${config.color}`}
                                >
                                  <Icon className="h-3 w-3" />
                                  <span>
                                    {entry.type === "custom" && entry.customType
                                      ? entry.customType
                                      : config.label}
                                  </span>
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    exportEntryToPDF(entry, categoryName);
                                  }}
                                  className="glass-focus flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-neutral-500 hover:text-white hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-150"
                                  title="Export Entry to PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {entry.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-white/[0.05]">
                                {entry.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="flex items-center gap-1 rounded-md bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-neutral-500 border border-white/[0.06]"
                                  >
                                    <Tag className="h-2.5 w-2.5 text-neutral-600" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="relative mb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-neutral-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="absolute -inset-3 rounded-3xl bg-neutral-500/5 blur-xl" />
              </div>
              <h3 className="font-semibold text-white text-base" style={{ fontFamily: "var(--font-display)" }}>
                {hasActiveFilters ? "No results found" : "No entries yet"}
              </h3>
              <p className="mt-1.5 text-xs text-neutral-600 leading-relaxed">
                {hasActiveFilters
                  ? "No documents match your filters. Try a different search or clear filters."
                  : "Start by writing your first learning logs, decisions, or upload attachments."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="glass-focus mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
                >
                  Clear filters
                </button>
              ) : (
                <button
                  onClick={onCreateEntry}
                  className="glass-focus mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
                >
                  Create New Entry
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}