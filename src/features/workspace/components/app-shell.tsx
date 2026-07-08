"use client";

import { useState, useEffect } from "react";
import { Folder, Plus, Search, FolderPlus, PanelLeft, Pin } from "lucide-react";

import { ProfileMenu } from "./profile-menu";
import { CreateCategoryModal } from "./create-category-modal";
import { EntryList } from "@/features/entries/components/entry-list";
import { EntryEditor } from "@/features/entries/components/entry-editor";
import { EntryDetail } from "@/features/entries/components/entry-detail";

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

  // Entry flow states
  const [view, setView] = useState<ActiveView>("LIST");
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);

  // Reset page views when active category switches
  useEffect(() => {
    setView("LIST");
    setActiveEntry(null);
  }, [selectedCategoryId]);

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

        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search entries, tags..."
            disabled
            className="w-full rounded-lg border border-neutral-900 bg-neutral-900/30 py-2 pl-10 pr-4 text-sm text-neutral-400 outline-none placeholder:text-neutral-600 focus:border-neutral-800 transition"
          />
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
                  {categories.filter(c => c.isPinned).map((category) => {
                    const isSelected = category.id === selectedCategoryId;
                    return (
                      <div
                        key={category.id}
                        className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition hover:bg-neutral-900/40 ${
                          isSelected ? "bg-blue-600/5" : ""
                        }`}
                      >
                        <button
                          onClick={() => setSelectedCategoryId(category.id)}
                          className={`flex flex-1 items-center gap-2.5 text-left transition min-w-0 ${
                            isSelected ? "text-blue-400 font-semibold" : "text-neutral-400 hover:text-white"
                          }`}
                        >
                          <Folder className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-neutral-500"}`} />
                          <span className="truncate">{category.name}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePin(category.id, false);
                          }}
                          className="p-1 text-blue-400 hover:text-red-450 transition rounded hover:bg-neutral-900/60 flex-shrink-0"
                          title="Unpin category"
                        >
                          <Pin className="h-3.5 w-3.5 fill-blue-500 text-blue-400" />
                        </button>
                      </div>
                    );
                  })}
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
              {categories.filter(c => !c.isPinned).map((category) => {
                const isSelected = category.id === selectedCategoryId;
                return (
                  <div
                    key={category.id}
                    className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition hover:bg-neutral-900/40 ${
                      isSelected ? "bg-blue-600/5" : ""
                    }`}
                  >
                    <button
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`flex flex-1 items-center gap-2.5 text-left transition min-w-0 ${
                        isSelected ? "text-blue-400 font-semibold" : "text-neutral-400 hover:text-white"
                      }`}
                    >
                      <Folder className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-neutral-500"}`} />
                      <span className="truncate">{category.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(category.id, true);
                      }}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-neutral-500 hover:text-white transition rounded hover:bg-neutral-900/60 flex-shrink-0"
                      title="Pin category"
                    >
                      <Pin className="h-3.5 w-3.5 text-neutral-500" />
                    </button>
                  </div>
                );
              })}

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

      {/* Floating Error Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-red-900/50 bg-red-950/85 px-4.5 py-3 text-xs font-bold text-red-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <span>⚠️</span>
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
