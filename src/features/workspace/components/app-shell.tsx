"use client";

import { useState } from "react";
import { Folder, Plus, Search, FolderPlus } from "lucide-react";

import { ProfileMenu } from "./profile-menu";
import { CreateCategoryModal } from "./create-category-modal";

interface Category {
  id: string;
  name: string;
}

interface AppShellProps {
  user: {
    username: string;
    email: string;
  };
  initialCategories: Category[];
}

export function AppShell({ user, initialCategories }: AppShellProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateSuccess = (newCategory: Category) => {
    setCategories((prev) => [newCategory, ...prev]);
    setSelectedCategoryId(newCategory.id);
  };

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 font-sans text-neutral-200 select-none">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-neutral-900 bg-neutral-950 px-6 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white shadow-lg shadow-blue-500/20">
            N
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            NexDocsHub
          </span>
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

        {/* Profile */}
        <ProfileMenu user={user} />
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-64 flex-col border-r border-neutral-900 bg-neutral-950/20 p-4">
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
                      ? "bg-blue-600/10 text-blue-400"
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

          {/* New Category Button */}
          <div className="border-t border-neutral-900 pt-4 mt-auto">
            <button
              onClick={() => setIsOpenModal(true)}
              className="flex w-full items-center gap-3 rounded-lg border border-neutral-900 border-dashed hover:border-neutral-800 bg-neutral-900/10 px-3 py-2 text-left text-sm font-semibold text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
            >
              <Plus className="h-4 w-4 text-neutral-500" />
              <span>New Category</span>
            </button>
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
          ) : (
            /* Selected Category Display placeholder */
            <div className="flex flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <Folder className="h-6 w-6 text-blue-500" />
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    {selectedCategory?.name ?? "Select a category"}
                  </h1>
                </div>
                <button className="flex items-center gap-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition">
                  <Plus className="h-3.5 w-3.5" />
                  <span>New Entry</span>
                </button>
              </div>

              <div className="flex flex-1 flex-col items-center justify-center border border-dashed border-neutral-900 rounded-xl bg-neutral-900/5 p-8 text-center">
                <p className="text-sm text-neutral-500 italic">
                  No entries inside &ldquo;{selectedCategory?.name}&rdquo; yet.
                </p>
              </div>
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
