"use client";

import { useState, useEffect, useRef } from "react";
import { Search, FileText, Paperclip, Loader2 } from "lucide-react";

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
              className="bg-blue-600/30 text-blue-300 rounded-sm px-0.5 font-semibold"
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[15vh] p-4 animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-950 shadow-2xl flex flex-col max-h-[60vh] animate-in scale-in duration-200"
      >
        {/* Search Input field */}
        <div className="relative border-b border-neutral-900 flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-neutral-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search entries, content, attachments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent py-4 pl-12 pr-16 text-white text-sm outline-none placeholder:text-neutral-600"
          />
          <div className="absolute right-4 flex items-center gap-1.5">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            <kbd className="hidden sm:inline-block border border-neutral-900 bg-neutral-900/50 rounded-md px-1.5 py-0.5 text-[10px] text-neutral-500 font-sans">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Pane */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {error && (
            <div className="p-4 text-center text-xs text-red-400">{error}</div>
          )}

          {query.trim().length >= 2 && results.length === 0 && !isLoading && !error && (
            <div className="p-8 text-center text-sm text-neutral-500 italic">
              No results found matching &ldquo;{query}&rdquo;
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="p-8 text-center text-xs text-neutral-600">
              Type at least 2 characters to search across your knowledge base...
            </div>
          )}

          {results.map((item, idx) => {
            const isFocused = idx === focusedIndex;
            const entryConfig = typeConfig[item.type] || {
              label: "Entry",
              color: "text-neutral-400 border-neutral-400/20 bg-neutral-400/10",
            };

            return (
              <div
                key={item.id}
                onClick={() => onSelectResult(item)}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`flex flex-col rounded-xl p-3.5 text-left transition cursor-pointer select-none border ${
                  isFocused
                    ? "bg-neutral-900 border-neutral-800"
                    : "border-transparent bg-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                    {item.categoryName}
                  </span>
                  <span className="text-neutral-600">&bull;</span>
                  <span
                    className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${entryConfig.color}`}
                  >
                    {item.type === "custom" && item.customType
                      ? item.customType
                      : entryConfig.label}
                  </span>
                  {item.format === "files" && (
                    <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-500">
                      Vault
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                    {highlightMatch(item.title, query)}
                  </h4>
                </div>

                {item.snippet && (
                  <p className="mt-1.5 text-xs text-neutral-450 leading-relaxed font-sans line-clamp-2">
                    {highlightMatch(item.snippet, query)}
                  </p>
                )}

                {item.matchedAttachment && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-neutral-500 font-medium bg-neutral-900/40 rounded px-2 py-0.5 w-fit border border-neutral-900/30">
                    <Paperclip className="h-3 w-3 text-neutral-500" />
                    <span>Matched attachment:</span>
                    <span className="text-neutral-450 truncate max-w-[200px]">
                      {highlightMatch(item.matchedAttachment, query)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Search Modal Footer */}
        {results.length > 0 && (
          <div className="border-t border-neutral-900 bg-neutral-900/10 px-4 py-2 flex items-center gap-4 text-[10px] text-neutral-500 font-medium">
            <span className="flex items-center gap-1">
              <kbd className="border border-neutral-900 bg-neutral-900/60 rounded px-1.5 py-0.5 font-sans">
                &uarr;&darr;
              </kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="border border-neutral-900 bg-neutral-900/60 rounded px-1.5 py-0.5 font-sans">
                &crarr;
              </kbd>
              <span>to select</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
