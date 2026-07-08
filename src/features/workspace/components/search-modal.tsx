"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Paperclip, Loader2, Command, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";

import { typeConfig } from "@/features/entries/components/entry-list";

interface SearchResult {
  id: string;
  title: string;
  type: string;
  customType?: string;
  tags: string[];
  categoryId: string;
  categoryName: string;
  format: "note" | "files";
  snippet: string;
  matchedAttachment?: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (result: SearchResult) => void;
}

export function SearchModal({
  isOpen,
  onClose,
  onSelectResult,
}: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount/open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setFocusedIndex(0);
    }
  }, [isOpen]);

  // Global escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Cycle focused item with arrow keys
  useEffect(() => {
    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!isOpen || results.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const activeResult = results[focusedIndex];
        if (activeResult) {
          onSelectResult(activeResult);
        }
      }
    };

    window.addEventListener("keydown", handleArrowKeys);
    return () => window.removeEventListener("keydown", handleArrowKeys);
  }, [isOpen, results, focusedIndex, onSelectResult]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Query API on text input change with AbortController
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchSearch = async () => {
      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();

        if (res.ok && json.success) {
          setResults(json.data);
          setFocusedIndex(0);
        } else {
          setError(json.error?.message ?? "Search failed.");
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Search API failed:", err);
          setError("Something went wrong.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSearch();

    return () => {
      controller.abort();
    };
  }, [query]);

  const highlightMatch = (text: string, search: string) => {
    if (!search || !text) return text;
    const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const parts = text.split(new RegExp(`(${escapedSearch})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === search.toLowerCase() ? (
            <mark
              key={i}
              className="bg-blue-500/25 text-blue-300 rounded-sm px-0.5 font-bold not-italic"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-md pt-[14vh] p-4 animate-in fade-in duration-150">
      <div
        ref={containerRef}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0f16]/95 backdrop-blur-xl shadow-2xl shadow-black/60 flex flex-col max-h-[60vh] animate-in scale-in duration-200"
      >
        {/* Search Input */}
        <div className="relative border-b border-white/[0.06] flex items-center">
          {isLoading ? (
            <Loader2 className="absolute left-4 h-4.5 w-4.5 animate-spin text-blue-500" />
          ) : (
            <Search className="absolute left-4 h-4.5 w-4.5 text-neutral-600" />
          )}
          <input
            ref={inputRef}
            type="text"
            placeholder="Search your knowledge base..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent py-4 pl-12 pr-20 text-sm text-white outline-none placeholder:text-neutral-700 font-medium"
          />
          <div className="absolute right-4 flex items-center gap-1.5">
            <kbd className="hidden sm:flex items-center gap-1 border border-white/[0.08] bg-white/[0.04] rounded-md px-2 py-1 text-[10px] text-neutral-600 font-sans">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Pane */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="p-6 text-center text-xs text-red-400">{error}</div>
          )}

          {query.trim().length >= 2 && results.length === 0 && !isLoading && !error && (
            <div className="p-10 text-center">
              <p className="text-sm text-neutral-500">No results for &ldquo;{query}&rdquo;</p>
              <p className="text-xs text-neutral-700 mt-1">Try a different term or check spelling</p>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="p-8 text-center">
              <Search className="h-8 w-8 text-neutral-800 mx-auto mb-3" />
              <p className="text-sm text-neutral-600 font-medium">Search your knowledge</p>
              <p className="text-xs text-neutral-700 mt-1">Type 2+ characters to search titles, content and tags</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2 space-y-1">
              {results.map((item, idx) => {
                const isFocused = idx === focusedIndex;
                const entryConfig = typeConfig[item.type] || {
                  label: "Entry",
                  color: "text-neutral-400 border-neutral-400/20 bg-neutral-400/10",
                };
                const Icon = (typeConfig[item.type])?.icon;

                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectResult(item)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`flex flex-col rounded-xl p-3.5 text-left transition-all cursor-pointer select-none border ${
                      isFocused
                        ? "bg-white/[0.05] border-white/[0.08]"
                        : "border-transparent bg-transparent hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Category breadcrumb + type badge */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        {item.categoryName}
                      </span>
                      <span className="text-neutral-700 text-[10px]">/</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 ${entryConfig.color}`}
                      >
                        {Icon && <Icon className="h-2.5 w-2.5" />}
                        {item.type === "custom" && item.customType
                          ? item.customType
                          : entryConfig.label}
                      </span>
                      {item.format === "files" && (
                        <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[9px] font-bold text-yellow-500">
                          Vault
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                      {highlightMatch(item.title, query)}
                    </h4>

                    {/* Content snippet */}
                    {item.snippet && (
                      <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                        {highlightMatch(item.snippet, query)}
                      </p>
                    )}

                    {/* Matched attachment */}
                    {item.matchedAttachment && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-neutral-600 font-medium bg-white/[0.03] rounded-md px-2 py-1 w-fit border border-white/[0.05]">
                        <Paperclip className="h-2.5 w-2.5" />
                        <span>Attachment:</span>
                        <span className="text-neutral-500 truncate max-w-[180px]">
                          {highlightMatch(item.matchedAttachment, query)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t border-white/[0.05] bg-white/[0.02] px-4 py-2.5 flex items-center gap-5 text-[10px] text-neutral-600 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="flex items-center gap-0.5">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
              </span>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <CornerDownLeft className="h-3 w-3" />
              <span>select</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="border border-white/[0.08] bg-white/[0.04] rounded px-1.5 py-0.5 text-[9px] font-sans">ESC</kbd>
              <span>close</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
