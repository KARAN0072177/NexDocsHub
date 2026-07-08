"use client";

import { useState, useEffect, useRef } from "react";
import { Folder, Plus, Search, FolderPlus, PanelLeft, Pin, MoreVertical, Edit2, Trash2 } from "lucide-react";

import { ProfileMenu } from "./profile-menu";
import { CreateCategoryModal } from "./create-category-modal";
import { EntryList } from "@/features/entries/components/entry-list";
import { EntryEditor } from "@/features/entries/components/entry-editor";
import { EntryDetail } from "@/features/entries/components/entry-detail";
import { SearchModal } from "./search-modal";

interface Category {
  id: string;
  name: string;
  isPinned: boolean;
}

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
}

interface AppShellProps {
  user: {
    username: string;
    email: string;
  };
  initialCategories: Category[];
}

type ActiveView = "LIST" | "EDITOR" | "DETAIL";

export function AppShell({ user, initialCategories }: AppShellProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategories[0]?.id ?? null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pinError, setPinError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Category options states
  const [activeMenuCategoryId, setActiveMenuCategoryId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Entry flow states
  const [view, setView] = useState<ActiveView>("LIST");
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);

  // Reset page views when active category switches
  useEffect(() => {
    setView("LIST");
    setActiveEntry(null);
  }, [selectedCategoryId]);

  // Listen for Ctrl+K / Cmd+K global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown categories options on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setActiveMenuCategoryId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleCreateSuccess = (newCategory: { id: string; name: string }) => {
    const fullCategory: Category = {
      ...newCategory,
      isPinned: false,
    };
    setCategories((prev) => [fullCategory, ...prev]);
    setSelectedCategoryId(fullCategory.id);
  };

  const handleTogglePin = async (categoryId: string, isPinned: boolean) => {
    setPinError(null);

    // Client-side validation: prevent pinning more than 3
    if (isPinned && categories.filter((c) => c.isPinned).length >= 3) {
      setToast({
        message: "You can only pin up to 3 categories.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    try {
      const res = await fetch(`/api/categories/${categoryId}/pin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        if (result.error?.code === "PIN_LIMIT_REACHED") {
          setToast({
            message: "You can only pin up to 3 categories.",
            type: "error",
          });
          setTimeout(() => setToast(null), 3000);
        }
        return;
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, isPinned } : c))
      );
    } catch {
      setToast({
        message: "Failed to update pin state.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleSelectSearchResult = async (result: any) => {
    setIsSearchOpen(false);
    try {
      const res = await fetch(`/api/entries/${result.id}`);
      const json = await res.json();

      if (res.ok && json.success) {
        // Set view category
        setSelectedCategoryId(result.categoryId);
        // Load details screen
        setActiveEntry(json.data);
        setView("DETAIL");
      } else {
        setToast({
          message: "Failed to load document details.",
          type: "error",
        });
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast({
        message: "Network error loading document.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleRenameCategory = async (categoryId: string) => {
    const name = editingName.trim();
    if (!name) return;

    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();

      if (res.ok && result.success) {
        setCategories((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, name } : c))
        );
        setEditingCategoryId(null);
        setToast({
          message: "Category renamed successfully.",
          type: "success",
        });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({
          message: result.error?.message ?? "Failed to rename category.",
          type: "error",
        });
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast({
        message: "Network error renaming category.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      const res = await fetch(`/api/categories/${deletingCategory.id}`, {
        method: "DELETE",
      });
      const result = await res.json();

      if (res.ok && result.success) {
        const remaining = categories.filter((c) => c.id !== deletingCategory.id);
        setCategories(remaining);

        if (selectedCategoryId === deletingCategory.id) {
          setSelectedCategoryId(remaining[0]?.id ?? null);
        }

        setDeletingCategory(null);
        setToast({
          message: "Category and all entries deleted successfully.",
          type: "success",
        });
        setTimeout(() => setToast(null), 3000);
      } else {
        setToast({
          message: result.error?.message ?? "Failed to delete category.",
          type: "error",
        });
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast({
        message: "Network error deleting category.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const renderCategoryItem = (category: Category) => {
    const isSelected = category.id === selectedCategoryId;

    if (editingCategoryId === category.id) {
      return (
        <form
          key={category.id}
          onSubmit={(e) => {
            e.preventDefault();
            handleRenameCategory(category.id);
          }}
          className="flex items-center gap-1.5 w-full bg-neutral-900 border border-neutral-800 rounded-lg p-1.5 my-0.5 animate-in fade-in duration-100"
        >
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white outline-none border-none p-0.5 font-medium"
            autoFocus
            maxLength={50}
          />
          <button
            type="submit"
            className="text-green-500 hover:text-green-400 p-0.5 text-xs font-bold transition flex-shrink-0"
            title="Save name"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setEditingCategoryId(null)}
            className="text-red-500 hover:text-red-400 p-0.5 text-xs font-bold transition flex-shrink-0"
            title="Cancel rename"
          >
            ✗
          </button>
        </form>
      );
    }

    return (
      <div
        key={category.id}
        className={`group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition hover:bg-neutral-900/40 ${isSelected ? "bg-blue-600/5" : ""
          }`}
      >
        <button
          onClick={() => setSelectedCategoryId(category.id)}
          className={`flex flex-1 items-center gap-2.5 text-left transition min-w-0 ${isSelected ? "text-blue-400 font-semibold" : "text-neutral-400 hover:text-white"
            }`}
        >
          <Folder className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-neutral-500"}`} />
          <span className="truncate">{category.name}</span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex-shrink-0 ml-1.5 transition duration-150">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin(category.id, !category.isPinned);
            }}
            className="p-1 text-neutral-500 hover:text-white transition rounded hover:bg-neutral-900/60"
            title={category.isPinned ? "Unpin category" : "Pin category"}
          >
            <Pin className={`h-3.5 w-3.5 ${category.isPinned ? "fill-blue-500 text-blue-450" : "text-neutral-500"}`} />
          </button>

          <div
            ref={activeMenuCategoryId === category.id ? menuRef : null}
            className="relative"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuCategoryId(activeMenuCategoryId === category.id ? null : category.id);
              }}
              className="p-1 text-neutral-500 hover:text-white transition rounded hover:bg-neutral-900/60"
              title="Category options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {activeMenuCategoryId === category.id && (
              <div className="absolute right-0 mt-1 w-24 origin-top-right rounded-lg border border-neutral-900 bg-neutral-950 p-1 shadow-xl z-50 animate-in fade-in duration-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategoryId(category.id);
                    setEditingName(category.name);
                    setActiveMenuCategoryId(null);
                  }}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-neutral-300 hover:bg-neutral-900 hover:text-white transition font-medium"
                >
                  <Edit2 className="h-3 w-3 text-neutral-550" />
                  <span>Rename</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCategory(category);
                    setActiveMenuCategoryId(null);
                  }}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-red-405 hover:bg-red-500/10 hover:text-red-300 transition font-medium"
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 font-sans text-neutral-200 select-none">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 z-10 flex-shrink-0">
        {/* Toggle Button & Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-neutral-450 hover:bg-neutral-900/60 hover:text-white transition focus:outline-none"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
              N
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              NexDocsHub
            </span>
          </div>
        </div>

        {/* Search trigger wrapper display */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="relative w-full max-w-md cursor-pointer group"
        >
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 group-hover:text-neutral-300 transition" />
          <div className="w-full rounded-lg border border-neutral-900 bg-neutral-900/30 py-2.5 pl-10 pr-16 text-xs text-neutral-500 group-hover:text-neutral-300 outline-none transition group-hover:border-neutral-800 flex items-center justify-between select-none">
            <span>Search knowledge base...</span>
            <kbd className="border border-neutral-850 bg-neutral-900/60 rounded px-1.5 py-0.5 text-[9px] font-sans flex items-center gap-0.5 select-none">
              <span>Ctrl</span><span>K</span>
            </kbd>
          </div>
        </div>

        {/* Top-Right placeholder to keep centering balanced */}
        <div className="w-10 h-10" />
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className={`border-r border-neutral-900 bg-neutral-950/20 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "w-64 p-4" : "w-0 p-0 border-r-0 overflow-hidden"}`}>
          <div className="w-[224px] flex flex-col flex-1 h-full min-w-[224px]">
            <div className="flex items-center justify-between px-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Categories
              </span>
              <button
                onClick={() => setIsOpenModal(true)}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-900 hover:text-white transition"
                title="Add Category"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {/* Pin Limit Error Message */}
            {pinError && (
              <div className="px-2 mb-2 text-[10px] font-bold text-red-400 animate-pulse transition">
                {pinError}
              </div>
            )}

            {/* Pinned Categories Section */}
            {categories.filter(c => c.isPinned).length > 0 && (
              <div className="mb-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 mb-1.5 block">
                  Pinned ({categories.filter(c => c.isPinned).length}/3)
                </span>
                <div className="space-y-0.5">
                  {categories.filter(c => c.isPinned).map((category) => renderCategoryItem(category))}
                </div>
              </div>
            )}

            {/* General Categories Section */}
            <div className="flex-1 overflow-y-auto space-y-0.5 animate-in fade-in duration-200">
              {categories.filter(c => c.isPinned).length > 0 && categories.filter(c => !c.isPinned).length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-2 mb-1.5 block">
                  Folders
                </span>
              )}
              {categories.filter(c => !c.isPinned).map((category) => renderCategoryItem(category))}

              {categories.length === 0 && (
                <p className="px-3 py-4 text-xs text-neutral-600 italic">
                  No categories yet
                </p>
              )}
            </div>

            {/* Profile Section replaces New Category Button at bottom of sidebar */}
            <div className="border-t border-neutral-900 pt-4 mt-auto">
              <ProfileMenu user={user} />
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-neutral-950 p-8">
          {categories.length === 0 ? (
            /* Empty State matching Mockup */
            <div className="flex flex-1 flex-col items-center justify-center text-center max-w-xl mx-auto">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900/50 text-neutral-400 shadow-xl mb-6">
                <FolderPlus className="h-8 w-8 text-neutral-500" />
              </div>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Welcome to NexDocsHub
              </h2>
              <p className="mt-2 text-sm text-neutral-400 leading-relaxed">
                Create your first category to start organizing your personal
                knowledge base, learning logs, and architecture decisions.
              </p>
              <button
                onClick={() => setIsOpenModal(true)}
                className="mt-8 flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition focus:outline-none shadow-lg shadow-blue-600/10"
              >
                <Plus className="h-4 w-4" />
                <span>Create your first category</span>
              </button>
            </div>
          ) : selectedCategoryId && selectedCategory ? (
            /* Render active flow screen based on view state */
            <>
              {view === "LIST" && (
                <EntryList
                  categoryId={selectedCategoryId}
                  categoryName={selectedCategory.name}
                  onCreateEntry={() => {
                    setActiveEntry(null);
                    setView("EDITOR");
                  }}
                  onSelectEntry={(entry) => {
                    setActiveEntry(entry);
                    setView("DETAIL");
                  }}
                />
              )}

              {view === "EDITOR" && (
                <EntryEditor
                  categoryId={selectedCategoryId}
                  initialEntry={activeEntry ?? undefined}
                  onSave={() => setView("LIST")}
                  onCancel={() =>
                    setView(activeEntry ? "DETAIL" : "LIST")
                  }
                />
              )}

              {view === "DETAIL" && activeEntry && (
                <EntryDetail
                  entry={activeEntry}
                  onEdit={() => setView("EDITOR")}
                  onDelete={() => setView("LIST")}
                  onBack={() => setView("LIST")}
                />
              )}
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-neutral-500 italic text-sm">
              Select a category to view entries.
            </div>
          )}
        </main>
      </div>

      {/* Modal Dialog */}
      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsOpenModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Global Cmd+K Search Modal Overlay */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Cascading Sweeping Delete Confirmation Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm transform overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950 p-6 shadow-2xl transition-all animate-in scale-in duration-200">
            <h3 className="text-md font-bold text-white leading-none">Delete Category?</h3>
            <p className="mt-3 text-xs text-neutral-450 leading-relaxed">
              Are you sure you want to delete the category <span className="font-semibold text-white">&ldquo;{deletingCategory.name}&rdquo;</span>?
            </p>
            <div className="mt-4 rounded-lg border border-red-950/30 bg-red-950/20 p-3 text-[11px] text-red-400 leading-normal flex items-start gap-2 font-medium">
              <span className="mt-0.5">⚠️</span>
              <span>This will permanently delete all entries in this category and sweep all attached files stored in AWS S3 storage. This action cannot be undone.</span>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="rounded-lg border border-neutral-900 bg-neutral-900/30 px-3.5 py-2 text-xs font-bold text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="rounded-lg bg-red-650 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-lg shadow-red-650/10"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Error Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-red-900/50 bg-red-950/85 px-4.5 py-3 text-xs font-bold text-red-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <span>{toast.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );

  // Helper helper to handle Modal state
  function setIsOpenModal(open: boolean) {
    setIsModalOpen(open);
  }
}
