"use client";

import { useState, useEffect } from "react";
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
  const [htmlContent, setHtmlContent] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    try {
      const html = marked.parse(entry.content) as string;
      setHtmlContent(html);
    } catch (err) {
      console.error("Markdown parse error:", err);
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
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-neutral-900 bg-neutral-950 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:border-neutral-800 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to entries</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-lg border border-red-950 bg-red-950/20 hover:bg-red-950/40 px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 transition"
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
                  className="flex items-center gap-1 rounded bg-neutral-900 border border-neutral-900/60 px-2.5 py-1 text-xs text-neutral-400 font-medium"
                >
                  <Tag className="h-3 w-3 text-neutral-500" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-neutral-900" />

        {/* Content body */}
        {entry.format !== "files" && (
          <div className="prose prose-invert max-w-none text-neutral-300 leading-relaxed font-sans min-h-[150px]">
            {htmlContent ? (
              <div
                dangerouslySetInnerHTML={{ __html: htmlContent }}
                className="space-y-4"
              />
            ) : (
              <p className="text-neutral-600 text-sm italic">No content text.</p>
            )}
          </div>
        )}

        {entry.format === "files" && entry.attachments.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-neutral-900 rounded-xl bg-neutral-900/5">
            <p className="text-sm text-neutral-500 italic">This vault contains no document files yet. Click &ldquo;Edit&rdquo; to add some.</p>
          </div>
        )}

        {/* Attachments Section */}
        {entry.attachments.length > 0 && (
          <div className="border-t border-neutral-900 pt-6 mt-8 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-neutral-500" />
              <span>Attachments ({entry.attachments.length})</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entry.attachments.map((file, index) => {
                const isImage = file.mimeType.startsWith("image/");
                return (
                  <div
                    key={index}
                    className="flex flex-col rounded-xl border border-neutral-900 bg-neutral-900/10 hover:border-neutral-800 transition overflow-hidden"
                  >
                    {/* Direct Image Preview */}
                    {isImage && (
                      <div className="relative aspect-video w-full border-b border-neutral-900 bg-neutral-950 flex items-center justify-center overflow-hidden group">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="object-contain max-h-full max-w-full transition duration-300 group-hover:scale-102"
                        />
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2 right-2 rounded-lg bg-neutral-950/80 p-1.5 text-neutral-400 hover:text-white transition"
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
                        className="rounded-lg border border-neutral-800 bg-neutral-950 p-2 text-neutral-400 hover:border-neutral-700 hover:text-white transition flex-shrink-0"
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

      {/* Delete Confirmation Modal Overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md transform overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl transition-all animate-in scale-in duration-200">
            <h3 className="text-lg font-bold text-white">Delete Entry</h3>
            <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
              Are you sure you want to delete &ldquo;{entry.title}&rdquo;? This
              will permanently remove the entry and all its S3 attachments. This
              action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-800 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/15"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Delete Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
