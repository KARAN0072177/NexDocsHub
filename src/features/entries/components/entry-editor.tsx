"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import {
  X,
  UploadCloud,
  File,
  Loader2,
  Trash2,
  Image as ImageIcon,
  Paperclip,
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
  customType?: string;
}

interface EntryEditorProps {
  categoryId: string;
  initialEntry?: Entry;
  onSave: () => void;
  onCancel: () => void;
}

export function EntryEditor({
  categoryId,
  initialEntry,
  onSave,
  onCancel,
}: EntryEditorProps) {
  const [title, setTitle] = useState(initialEntry?.title ?? "");
  const [type, setType] = useState(initialEntry?.type ?? "learning_day");
  const [content, setContent] = useState(initialEntry?.content ?? "");
  const [tagsInput, setTagsInput] = useState(
    initialEntry?.tags.join(", ") ?? ""
  );
  const [attachments, setAttachments] = useState<Attachment[]>(
    initialEntry?.attachments ?? []
  );
  const [customType, setCustomType] = useState(
    initialEntry?.customType ?? ""
  );

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Markdown rendering
  const [previewHtml, setPreviewHtml] = useState("");

  useEffect(() => {
    try {
      const html = marked.parse(content) as string;
      setPreviewHtml(html);
    } catch (err) {
      console.error("Markdown parse error:", err);
    }
  }, [content]);

  // Handle S3 direct upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // 1. Get presigned upload URL
        const res = await fetch("/api/upload/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type || "application/octet-stream",
          }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
          setUploadError(`Failed to prepare upload for ${file.name}`);
          continue;
        }

        const { uploadUrl, fileUrl } = result.data;

        // 2. Upload file directly to S3 via PUT
        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
          body: file,
        });

        if (!uploadRes.ok) {
          setUploadError(`S3 Upload failed for ${file.name}`);
          continue;
        }

        // 3. Append to state
        const newAttachment: Attachment = {
          name: file.name,
          url: fileUrl,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        };

        setAttachments((prev) => [...prev, newAttachment]);
      } catch (err) {
        console.error("File upload error:", err);
        setUploadError(`Error uploading ${file.name}`);
      }
    }

    setUploading(false);
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSaveError("Title is required.");
      return;
    }

    setIsSubmitting(true);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t !== "");

    const payload = {
      title: trimmedTitle,
      content,
      type,
      customType: type === "custom" ? customType : undefined,
      tags,
      attachments,
      categoryId,
    };

    try {
      const url = initialEntry
        ? `/api/entries/${initialEntry._id}`
        : "/api/entries";
      const method = initialEntry ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setSaveError(result.error?.message ?? "Failed to save entry.");
        return;
      }

      onSave();
    } catch {
      setSaveError("Something went wrong saving the entry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden select-none">
      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4">
        <h1 className="text-xl font-bold text-white tracking-tight">
          {initialEntry ? `Edit: ${initialEntry.title}` : "New Entry"}
        </h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:bg-neutral-800 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-600/15"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Save Entry</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
          {saveError}
        </div>
      )}

      {/* Workspace Split Panes */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {/* Left Form Editor */}
        <form className="flex flex-1 flex-col overflow-y-auto space-y-4 pr-1">
          {/* Title input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Title
            </label>
            <input
              type="text"
              placeholder="Give your entry a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-neutral-900 bg-neutral-900/10 px-4 py-2.5 text-white outline-none transition focus:border-neutral-800 text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type dropdown */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Entry Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-neutral-900 bg-neutral-900/10 px-4 py-2.5 text-neutral-200 outline-none transition focus:border-neutral-800 text-sm font-semibold"
              >
                {Object.entries(typeConfig).map(([key, config]) => (
                  <option key={key} value={key} className="bg-neutral-900">
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags input */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Tags (comma separated)
              </label>
              <input
                type="text"
                placeholder="mongodb, aws, security"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-neutral-900 bg-neutral-900/10 px-4 py-2.5 text-white outline-none transition focus:border-neutral-800 text-sm"
              />
            </div>
          </div>

          {type === "custom" && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Custom Type Name
              </label>
              <input
                type="text"
                placeholder="e.g. Banking, Finances, Personal"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-neutral-900 bg-neutral-900/10 px-4 py-2.5 text-white outline-none transition focus:border-neutral-800 text-sm font-semibold"
              />
            </div>
          )}

          {/* S3 Attachment uploader zone */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Attachments (S3 Cloud Storage)
            </label>
            <div className="relative flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-900 bg-neutral-900/5 p-6 text-center hover:bg-neutral-900/10 transition cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                disabled={uploading || isSubmitting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <p className="text-sm font-medium text-neutral-400">
                    Uploading directly to AWS S3...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="h-7 w-7 text-neutral-500" />
                  <p className="text-sm font-medium text-neutral-300">
                    Drag files here or click to upload
                  </p>
                  <p className="text-xs text-neutral-500">
                    Supports Images, PDFs, docx, pptx, etc.
                  </p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="mt-1 text-xs text-red-500">{uploadError}</p>
            )}

            {/* List of uploaded attachments */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-neutral-900 bg-neutral-900/20 px-3.5 py-2 text-xs text-neutral-300"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {file.mimeType.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      ) : (
                        <File className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                      )}
                      <span className="truncate font-semibold">{file.name}</span>
                      <span className="text-neutral-500 flex-shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="text-neutral-500 hover:text-red-400 transition"
                      title="Remove attachment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Markdown Content textarea */}
          <div className="flex-1 flex flex-col min-h-[300px]">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Content (Markdown)
            </label>
            <textarea
              placeholder="Write your logs, decisions, notes here in Markdown format..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isSubmitting}
              className="w-full flex-1 rounded-lg border border-neutral-900 bg-neutral-900/10 p-4 text-white outline-none transition focus:border-neutral-800 text-sm font-mono leading-relaxed resize-none"
            />
          </div>
        </form>

        {/* Right Live HTML Preview */}
        <div className="flex flex-1 flex-col overflow-hidden border border-neutral-900 rounded-xl bg-neutral-900/5 p-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-500 border-b border-neutral-900 pb-2">
            Live Preview
          </label>
          <div className="flex-1 overflow-y-auto pr-1">
            {content ? (
              <div
                dangerouslySetInnerHTML={{ __html: previewHtml }}
                className="markdown-body prose prose-invert max-w-none text-sm text-neutral-300 leading-relaxed space-y-4 font-sans"
              />
            ) : (
              <p className="text-neutral-600 text-sm italic mt-2">
                Markdown preview will appear here as you type...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
