"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { marked } from "marked";
import {
  FileText,
  Calendar,
  Tag,
  Paperclip,
  Edit,
  Trash2,
  Download,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

import { typeConfig } from "./entry-list";

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

interface EntryDetailProps {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function EntryDetail({
  entry,
  onEdit,
  onDelete,
  onBack,
}: EntryDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(entry.content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const htmlContent = useMemo(() => {
    try {
      return marked.parse(entry.content) as string;
    } catch (err) {
      console.error("Markdown parse error:", err);
      return "";
    }
  }, [entry.content]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch(`/api/entries/${entry._id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setDeleteError(result.error?.message ?? "Failed to delete entry.");
        return;
      }

      onDelete();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const config = typeConfig[entry.type] || {
    label: "Entry",
    icon: FileText,
    color: "text-neutral-400 bg-neutral-400/10 border-neutral-400/20",
  };
  const Icon = config.icon;

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden select-none">
      {/* CSS stylesheet override to style the TipTap WYSIWYG read viewport */}
      <style>{`
        .prose-detail h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .prose-detail h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .prose-detail p {
          margin-bottom: 0.8rem;
        }
        .prose-detail ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.8rem;
        }
        .prose-detail ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.8rem;
        }
        .prose-detail blockquote {
          border-left: 3px solid #2563eb;
          padding-left: 1rem;
          color: #a3a3a3;
          font-style: italic;
          margin-bottom: 0.8rem;
        }
        .prose-detail code {
          background-color: rgba(255, 255, 255, 0.05);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.85em;
          color: #fb7185;
        }
        .prose-detail pre {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 0.5rem;
          font-family: monospace;
          overflow-x: auto;
          margin-bottom: 0.8rem;
        }
        .prose-detail pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-size: inherit;
        }
        /* Tables styling */
        .prose-detail table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .prose-detail table td, .prose-detail table th {
          min-width: 1em;
          border: 1px solid #262626;
          padding: 6px 8px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .prose-detail table th {
          background-color: rgba(255, 255, 255, 0.05);
          font-weight: bold;
          text-align: left;
        }
        /* Checkbox lists styling */
        .prose-detail ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
          margin-bottom: 0.8rem;
        }
        .prose-detail ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
        }
        .prose-detail ul[data-type="taskList"] li label {
          display: flex;
          align-items: center;
          height: 1.25rem;
          user-select: none;
        }
        .prose-detail ul[data-type="taskList"] li label input {
          cursor: pointer;
          accent-color: #2563eb;
          margin: 0;
        }
      `}</style>

      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-5 mb-7">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-neutral-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-white transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-900/30 bg-red-950/20 hover:bg-red-900/30 hover:border-red-800/40 px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
          {deleteError}
        </div>
      )}

      {/* Main detail content */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-10">
        {/* Title & metadata panel */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${config.color}`}
            >
              <Icon className="h-4 w-4" />
              <span>
                {entry.type === "custom" && entry.customType
                  ? entry.customType
                  : config.label}
              </span>
            </span>

            <span className="flex items-center gap-1 text-xs text-neutral-500">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(entry.createdAt)}</span>
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
            {entry.title}
          </h1>

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded bg-white/[0.04] border border-white/[0.06] px-2.5 py-1 text-xs text-neutral-400 font-medium"
                >
                  <Tag className="h-3 w-3 text-neutral-500" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06]" />

        {/* Content body */}
        {entry.format !== "files" && (
          <div className="relative group border border-white/[0.06] bg-white/[0.01] rounded-2xl p-6 min-h-[150px]">
            {htmlContent && (
              <button
                type="button"
                onClick={handleCopyContent}
                className="glass-focus absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-neutral-900/60 hover:bg-neutral-900 hover:border-white/[0.15] px-2.5 py-1.5 text-[10px] font-bold text-neutral-400 hover:text-white transition duration-155 shadow-md backdrop-blur-sm"
                title="Copy editor content"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-450" />
                    <span className="text-emerald-450 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            <div className="prose prose-invert max-w-none text-neutral-300 leading-relaxed font-sans pr-16">
              {htmlContent ? (
                <div
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  className="space-y-4 prose-detail"
                />
              ) : (
                <p className="text-neutral-600 text-sm italic">No content text.</p>
              )}
            </div>
          </div>
        )}

        {entry.format === "files" && entry.attachments.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
            <p className="text-sm text-neutral-500 italic">This vault contains no document files yet. Click &ldquo;Edit&rdquo; to add some.</p>
          </div>
        )}

        {/* Attachments Section */}
        {entry.attachments.length > 0 && (
          <div className="border-t border-white/[0.06] pt-6 mt-8 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-450 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-neutral-500" />
              <span>Attachments ({entry.attachments.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entry.attachments.map((file, index) => {
                const isImage = file.mimeType.startsWith("image/");
                return (
                  <div
                    key={index}
                    className="flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition overflow-hidden"
                  >
                    {/* Direct Image Preview */}
                    {isImage && (
                      <div className="relative aspect-video w-full border-b border-white/[0.06] bg-black/40 flex items-center justify-center overflow-hidden group">
                        <Image
                          src={file.url}
                          alt={file.name}
                          fill
                          unoptimized
                          sizes="(min-width: 640px) 50vw, 100vw"
                          className="object-contain transition duration-300 group-hover:scale-102"
                        />
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 rounded-lg bg-black/60 p-1.5 text-neutral-400 hover:text-white transition"
                          title="Open image in new tab"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}

                    {/* File info card details */}
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-neutral-200">
                          {file.name}
                        </p>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2 text-neutral-400 hover:border-white/[0.12] hover:text-white transition flex-shrink-0"
                        title="Download Attachment"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md transform overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1017]/90 backdrop-blur-xl p-6 shadow-2xl shadow-black/50 transition-all animate-in scale-in duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0">
                <Trash2 className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">Delete Entry?</h3>
                <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
                  Permanently delete &ldquo;{entry.title}&rdquo;? All S3 attachments will also be removed. This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-white/[0.07] hover:text-white transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-red-600/20 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
