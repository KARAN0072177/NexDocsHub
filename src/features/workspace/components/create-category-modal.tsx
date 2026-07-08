"use client";

import { useState } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCategory: { id: string; name: string }) => void;
}

export function CreateCategoryModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCategoryModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error?.message ?? "Failed to create category.");
        return;
      }

      setName("");
      onSuccess({
        id: result.data._id || result.data.id,
        name: result.data.name,
      });
      onClose();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md transform overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1017]/90 backdrop-blur-xl p-6 shadow-2xl shadow-black/50 transition-all animate-in scale-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
              <FolderPlus className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">New Category</h3>
              <p className="text-[11px] text-neutral-500 mt-0.5">Organize your knowledge base</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-600 hover:bg-white/[0.06] hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="categoryName"
              className="mb-2 block text-xs font-semibold text-neutral-400 uppercase tracking-wider"
            >
              Category Name
            </label>
            <input
              id="categoryName"
              type="text"
              placeholder="e.g. Engineering, Research, Ideas"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              disabled={isSubmitting}
              maxLength={50}
              autoFocus
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500/50 focus:bg-white/[0.06] placeholder:text-neutral-700"
            />
            {error && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
                <span className="font-semibold">{error}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-semibold text-neutral-400 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-5 py-2.5 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Category</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
