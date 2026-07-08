"use client";

import { useState, useEffect } from "react";
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
  Loader2,
  Tag,
} from "lucide-react";

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
  { label: string; icon: any; color: string }
> = {
  learning_day: {
    label: "Learning Day",
    icon: BookOpen,
    color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  },
  architecture_decision: {
    label: "Architecture Decision",
    icon: Scale,
    color: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  },
  project_progress: {
    label: "Project Progress",
    icon: TrendingUp,
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  },
  debugging_log: {
    label: "Debugging Log",
    icon: Bug,
    color: "text-rose-400 bg-rose-400/10 border-rose-400/20",
  },
  research_note: {
    label: "Research Note",
    icon: Search,
    color: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  },
  reference: {
    label: "Reference",
    icon: Bookmark,
    color: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  },
  meeting_note: {
    label: "Meeting Note",
    icon: Users,
    color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  },
  documentation: {
    label: "Documentation",
    icon: FileText,
    color: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  },
  journal: {
    label: "Journal",
    icon: PenTool,
    color: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  },
  custom: {
    label: "Custom",
    icon: FileText,
    color: "text-neutral-300 bg-neutral-300/10 border-neutral-300/20",
  },
};

export function EntryList({
  categoryId,
  categoryName,
  onCreateEntry,
  onSelectEntry,
}: EntryListProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchEntries() {
      setLoading(true);
      try {
        const response = await fetch(`/api/entries?categoryId=${categoryId}`);
        const result = await response.json();
        if (response.ok && result.success) {
          setEntries(result.data);
        }
      } catch (err) {
        console.error("Failed to load entries:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, [categoryId]);

  const filteredEntries = entries.filter((entry) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      entry.title.toLowerCase().includes(query) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(query)) ||
      (typeConfig[entry.type]?.label || "").toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          {categoryName}
        </h1>
        <button
          onClick={onCreateEntry}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition focus:outline-none shadow-lg shadow-blue-600/15"
        >
          <Plus className="h-4 w-4" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-600" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Inner Search bar */}
          {entries.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                placeholder="Filter entries by title, type, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-neutral-900 bg-neutral-900/10 py-2 pl-9 pr-4 text-sm text-white outline-none placeholder:text-neutral-600 focus:border-neutral-800 transition"
              />
            </div>
          )}

          {/* List entries */}
          {filteredEntries.length > 0 ? (
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredEntries.map((entry) => {
                const config = typeConfig[entry.type] || {
                  label: "Entry",
                  icon: FileText,
                  color: "text-neutral-400 bg-neutral-400/10 border-neutral-400/20",
                };
                const Icon = config.icon;

                return (
                  <div
                    key={entry._id}
                    onClick={() => onSelectEntry(entry)}
                    className="group flex flex-col justify-between rounded-xl border border-neutral-900/60 bg-neutral-900/10 p-5 hover:border-neutral-800 hover:bg-neutral-900/30 transition cursor-pointer select-none"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Title & Metadata */}
                      <div className="space-y-1 flex-1">
                        <h2 className="text-lg font-bold text-neutral-200 group-hover:text-white transition leading-snug">
                          {entry.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2.5 text-xs text-neutral-500">
                          <span>{formatDate(entry.createdAt)}</span>
                          {entry.attachments.length > 0 && (
                            <span className="flex items-center gap-1 text-neutral-400">
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>{entry.attachments.length}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Type Badge */}
                      <span
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.color}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>
                          {entry.type === "custom" && entry.customType
                            ? entry.customType
                            : config.label}
                        </span>
                      </span>
                    </div>

                    {/* Tags */}
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-neutral-900/40">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="flex items-center gap-1 rounded bg-neutral-900 px-2 py-0.5 text-[11px] font-medium text-neutral-400 border border-neutral-900"
                          >
                            <Tag className="h-2.5 w-2.5 text-neutral-500" />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State list view */
            <div className="flex flex-1 flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-900 bg-neutral-900/10 text-neutral-500 mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-lg">No entries found</h3>
              <p className="mt-1 text-sm text-neutral-500">
                {searchQuery
                  ? "No results match your filter criteria."
                  : "Start by writing your first learning logs, decisions, or upload attachments."}
              </p>
              {!searchQuery && (
                <button
                  onClick={onCreateEntry}
                  className="mt-5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-4 py-2 text-xs font-semibold text-white transition"
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
