"use client";

import { useState, useEffect } from "react";
import { Folder, Plus, Search, FolderPlus, PanelLeft } from "lucide-react";

import { ProfileMenu } from "./profile-menu";
import { CreateCategoryModal } from "./create-category-modal";
import { EntryList } from "@/features/entries/components/entry-list";
import { EntryEditor } from "@/features/entries/components/entry-editor";
import { EntryDetail } from "@/features/entries/components/entry-detail";

interface Category {
  id: string;
  name: string;
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

  // Entry flow states
  const [view, setView] = useState<ActiveView>("LIST");
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);

  // Reset page views when active category switches
  useEffect(() => {
    setView("LIST");
    setActiveEntry(null);
  }, [selectedCategoryId]);

  const handleCreateSuccess = (newCategory: Category) => {
    setCategories((prev) => [newCategory, ...prev]);
    setSelectedCategoryId(newCategory.id);
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

            {/* Categories List */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {categories.map((category) => {
                const isSelected = category.id === selectedCategoryId;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      isSelected
                        ? "bg-blue-600/10 text-blue-400 font-semibold"
                        : "text-neutral-400 hover:bg-neutral-900/60 hover:text-white"
                    }`}
                  >
                    <Folder
                      className={`h-4 w-4 ${
                        isSelected ? "text-blue-400" : "text-neutral-500"
                      }`}
                    />
                    <span className="truncate">{category.name}</span>
                  </button>
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
    </div>
  );

  // Helper helper to handle Modal state
  function setIsOpenModal(open: boolean) {
    setIsModalOpen(open);
  }
}
