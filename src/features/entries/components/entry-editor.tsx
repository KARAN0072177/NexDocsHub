"use client";

import { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { marked } from "marked";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import {
  Loader2,
  Trash2,
  Image as ImageIcon,
  Paperclip,
  UploadCloud,
  File,
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Braces,
  Undo,
  Redo,
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
  format?: "note" | "files";
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
  const [format, setFormat] = useState(
    initialEntry?.format ?? "note"
  );

  const [isPreview, setIsPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      setPreviewHtml(marked.parse(content) as string);
    } catch (err) {
      console.error("Markdown parse error:", err);
    }
  }, [content]);

  // Pre-parse markdown to HTML for TipTap editor instantiation
  const getInitialContent = () => {
    if (!initialEntry?.content) return "";
    try {
      return marked.parse(initialEntry.content) as string;
    } catch {
      return initialEntry.content;
    }
  };

  // Initialize TipTap Editor with extensions for Tables & Checklists
  const editor = useEditor({
    extensions: [
      StarterKit,
      Markdown,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: getInitialContent(),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[350px] outline-none text-neutral-300 leading-relaxed font-sans prose-editor",
      },
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        // If the pasted text contains markdown indicators, parse it into HTML elements
        if (
          text &&
          (text.includes("#") ||
            text.includes("---") ||
            text.includes("- ") ||
            text.includes("- [ ]") ||
            text.includes("- [x]") ||
            text.includes("|") ||
            text.includes("```"))
        ) {
          try {
            const html = marked.parse(text) as string;
            editor?.commands.insertContent(html);
            return true;
          } catch (err) {
            console.error("Paste parse error:", err);
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      setContent((editor.storage as any).markdown.getMarkdown());
    },
  });

  // Handle S3 direct upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadError("");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
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
      content: format === "files" ? "" : content,
      type,
      customType: type === "custom" ? customType : undefined,
      format,
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

  const ToolbarButton = ({
    onClick,
    isActive,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-lg p-1.5 transition text-xs font-semibold focus:outline-none border ${
        isActive
          ? "bg-blue-500/15 text-blue-400 border-blue-500/25 shadow-sm shadow-blue-500/10"
          : "text-neutral-500 hover:bg-white/[0.05] hover:text-white border-transparent"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden select-none">
      {/* CSS stylesheet override to style the TipTap WYSIWYG editor viewport */}
      <style>{`
        .prose-editor {
          outline: none;
        }
        .prose-editor h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .prose-editor h2 {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: white;
        }
        .prose-editor p {
          margin-bottom: 0.8rem;
        }
        .prose-editor ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.8rem;
        }
        .prose-editor ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.8rem;
        }
        .prose-editor blockquote {
          border-left: 3px solid #2563eb;
          padding-left: 1rem;
          color: #a3a3a3;
          font-style: italic;
          margin-bottom: 0.8rem;
        }
        .prose-editor code {
          background-color: rgba(255, 255, 255, 0.05);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: monospace;
          font-size: 0.85em;
          color: #fb7185;
        }
        .prose-editor pre {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 0.5rem;
          font-family: monospace;
          overflow-x: auto;
          margin-bottom: 0.8rem;
        }
        .prose-editor pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          color: inherit;
          font-size: inherit;
        }
        /* Tables styling */
        .prose-editor table {
          border-collapse: collapse;
          table-layout: fixed;
          width: 100%;
          margin: 0;
          overflow: hidden;
          margin-bottom: 1rem;
        }
        .prose-editor table td, .prose-editor table th {
          min-width: 1em;
          border: 1px solid #262626;
          padding: 6px 8px;
          vertical-align: top;
          box-sizing: border-box;
          position: relative;
        }
        .prose-editor table th {
          background-color: rgba(255, 255, 255, 0.05);
          font-weight: bold;
          text-align: left;
        }
        /* Checkbox lists styling */
        .prose-editor ul[data-type="taskList"] {
          list-style: none;
          padding: 0;
          margin-bottom: 0.8rem;
        }
        .prose-editor ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
        }
        .prose-editor ul[data-type="taskList"] li label {
          display: flex;
          align-items: center;
          height: 1.25rem;
          user-select: none;
        }
        .prose-editor ul[data-type="taskList"] li label input {
          cursor: pointer;
          accent-color: #2563eb;
          margin: 0;
        }
      `}</style>

      {/* Editor Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-5 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white tracking-tight">
            {initialEntry ? `Edit: ${initialEntry.title}` : "New Entry"}
          </h1>
          {format === "note" && (
            <div className="flex rounded-xl bg-white/[0.02] p-1 border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsPreview(false)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  !isPreview
                    ? "bg-white/[0.08] text-white border border-white/[0.08] shadow-sm"
                    : "text-neutral-500 hover:text-neutral-300 border border-transparent"
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setIsPreview(true)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  isPreview
                    ? "bg-white/[0.08] text-white border border-white/[0.08] shadow-sm"
                    : "text-neutral-500 hover:text-neutral-300 border border-transparent"
                }`}
              >
                Preview
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.12] px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Save Entry</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 rounded-lg border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
          {saveError}
        </div>
      )}

      {/* Workspace Panel Container */}
      <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
        {isPreview ? (
          /* Live Document Preview Layout */
          <div className="flex-1 overflow-y-auto w-full max-w-2xl mx-auto space-y-6 pb-10 pr-1 select-text">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeConfig[type]?.color || ""}`}>
                  {type === "custom" && customType ? customType : (typeConfig[type]?.label || "Custom")}
                </span>
                {tagsInput.split(",").map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="flex items-center gap-1 rounded bg-neutral-900 border border-neutral-900/40 px-2.5 py-0.5 text-xs text-neutral-450 font-medium">
                    #{tag.toLowerCase()}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
                {title || "Untitled Document"}
              </h1>
            </div>
            <div className="border-t border-neutral-900" />
            <div
              dangerouslySetInnerHTML={{ __html: previewHtml || "<p className='text-neutral-600 italic'>No content written yet...</p>" }}
              className="space-y-4 prose-editor text-sm text-neutral-350 leading-relaxed font-sans min-h-[250px]"
            />
            {attachments.length > 0 && (
              <div className="border-t border-neutral-900 pt-4 mt-6 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Attachments ({attachments.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between rounded-lg border border-neutral-900 bg-neutral-900/20 px-3.5 py-2 text-xs text-neutral-350">
                      <span className="truncate font-semibold">{file.name}</span>
                      <span className="text-neutral-500 font-medium ml-2 flex-shrink-0">({formatFileSize(file.size)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Editor Input Layout Form */
          <form className={`flex flex-col overflow-y-auto space-y-5 pr-1 ${format === "files" ? "w-full max-w-2xl mx-auto" : "flex-1"} pb-10`}>
            {/* Title input */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Title
              </label>
              <input
                type="text"
                placeholder="Give your entry a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/50 focus:bg-white/[0.06] placeholder:text-neutral-700 font-semibold"
              />
            </div>

            {/* Format Toggle Button Group */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Format
              </label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setFormat("note")}
                  className={`flex-1 rounded-xl border py-2.5 px-3 text-xs font-bold transition focus:outline-none ${
                    format === "note"
                      ? "bg-blue-500/10 border-blue-500/25 text-blue-400 shadow-sm shadow-blue-500/5"
                      : "bg-white/[0.02] border-white/[0.06] text-neutral-550 hover:text-neutral-350 hover:bg-white/[0.04]"
                  }`}
                >
                  Rich Text Document
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("files")}
                  className={`flex-1 rounded-xl border py-2.5 px-3 text-xs font-bold transition focus:outline-none ${
                    format === "files"
                      ? "bg-blue-500/10 border-blue-500/25 text-blue-400 shadow-sm shadow-blue-500/5"
                      : "bg-white/[0.02] border-white/[0.06] text-neutral-550 hover:text-neutral-350 hover:bg-white/[0.04]"
                  }`}
                >
                  Document Vault (Uploads Only)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type dropdown */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Entry Type
                </label>
                <div className="relative">
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0c0e14] px-4 py-3 text-neutral-300 outline-none transition focus:border-blue-500/50 focus:bg-[#0c0e14]/80 text-sm font-semibold appearance-none cursor-pointer"
                  >
                    {Object.entries(typeConfig).map(([key, config]) => (
                      <option key={key} value={key} className="bg-[#0c0e14] text-neutral-300">
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tags input */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Tags (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="mongodb, aws, security"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/50 focus:bg-white/[0.06] placeholder:text-neutral-700"
                />
              </div>
            </div>

            {type === "custom" && (
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Custom Type Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Banking, Finances, Personal"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/50 focus:bg-white/[0.06] placeholder:text-neutral-700 font-semibold"
                />
              </div>
            )}

            {/* S3 Attachment uploader zone */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Attachments (S3 Cloud Storage)
              </label>
              <div className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01] p-6 text-center hover:bg-white/[0.03] hover:border-white/[0.12] transition cursor-pointer">
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
                    <p className="text-xs font-semibold text-neutral-450">
                      Uploading directly to AWS S3...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <UploadCloud className="h-7 w-7 text-neutral-600" />
                    <p className="text-xs font-bold text-neutral-350">
                      Drag files here or click to upload
                    </p>
                    <p className="text-[10px] text-neutral-600 font-medium">
                      Supports Images, PDFs, docx, pptx, etc.
                    </p>
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="mt-1.5 text-xs text-red-400 font-semibold">{uploadError}</p>
              )}

              {attachments.length > 0 && (
                <div className="mt-3.5 space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-xs text-neutral-300 hover:bg-white/[0.04] transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {file.mimeType.startsWith("image/") ? (
                          <ImageIcon className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        ) : (
                          <File className="h-4 w-4 text-neutral-500 flex-shrink-0" />
                        )}
                        <span className="truncate font-semibold text-neutral-200">{file.name}</span>
                        <span className="text-neutral-600 font-medium flex-shrink-0">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        className="text-neutral-600 hover:text-red-400 transition"
                        title="Remove attachment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* TipTap Rich Text Editor block */}
            {format === "note" && editor && (
              <div className="flex flex-col min-h-[400px]">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Content (Rich Text Editor)
                </label>

                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 border border-white/[0.08] border-b-0 bg-white/[0.03] px-3 py-2.5 rounded-t-2xl">
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    isActive={editor.isActive("strike")}
                    title="Strike"
                  >
                    <Strikethrough className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive("code")}
                    title="Inline Code"
                  >
                    <Code className="h-4 w-4" />
                  </ToolbarButton>

                  <div className="h-5 w-[1px] bg-white/[0.08] mx-1" />

                  <ToolbarButton
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 1 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 1 })}
                    title="Heading 1"
                  >
                    <Heading1 className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() =>
                      editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 2 })}
                    title="Heading 2"
                  >
                    <Heading2 className="h-4 w-4" />
                  </ToolbarButton>

                  <div className="h-5 w-[1px] bg-white/[0.08] mx-1" />

                  <ToolbarButton
                    onClick={() =>
                      editor.chain().focus().toggleBulletList().run()
                    }
                    isActive={editor.isActive("bulletList")}
                    title="Bullet List"
                  >
                    <List className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() =>
                      editor.chain().focus().toggleOrderedList().run()
                    }
                    isActive={editor.isActive("orderedList")}
                    title="Numbered List"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() =>
                      editor.chain().focus().toggleBlockquote().run()
                    }
                    isActive={editor.isActive("blockquote")}
                    title="Blockquote"
                  >
                    <Quote className="h-4 w-4" />
                  </ToolbarButton>

                  <div className="h-5 w-[1px] bg-white/[0.08] mx-1" />

                  <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Undo"
                  >
                    <Undo className="h-4 w-4" />
                  </ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Redo"
                  >
                    <Redo className="h-4 w-4" />
                  </ToolbarButton>
                </div>

                {/* Editor content viewport */}
                <EditorContent
                  editor={editor}
                  className="w-full flex-1 rounded-b-2xl border border-white/[0.08] bg-white/[0.01] p-4 text-white outline-none focus-within:border-white/[0.12] text-sm overflow-y-auto min-h-[350px]"
                />
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
