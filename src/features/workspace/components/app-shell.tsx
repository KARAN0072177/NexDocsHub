"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import {
  Folder,
  Plus,
  Search,
  FolderPlus,
  PanelLeft,
  Pin,
  MoreVertical,
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

import { ProfileMenu } from "./profile-menu";
import { CreateCategoryModal } from "./create-category-modal";
import { EntryList } from "@/features/entries/components/entry-list";
import { EntryEditor } from "@/features/entries/components/entry-editor";
import { EntryDetail } from "@/features/entries/components/entry-detail";
import { SearchModal } from "./search-modal";
import { motion, AnimatePresence } from "framer-motion";

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

interface SearchResult {
  id: string;
  categoryId: string;
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

  const selectCategory = (categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setView("LIST");
    setActiveEntry(null);
  };

  // Floating Category Indicator Ball states & refs
  const sidebarRef = useRef<HTMLDivElement>(null);
  const categoriesListRef = useRef<HTMLDivElement>(null);
  const lastActiveId = useRef<string | null>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({
    opacity: 0,
    top: 0,
  });

  const updateIndicator = useCallback(() => {
    if (!selectedCategoryId || !sidebarRef.current) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const itemEl = sidebarRef.current.querySelector(
      `[data-category-id="${selectedCategoryId}"]`
    );
    if (!itemEl) {
      setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    const containerRect = sidebarRef.current.getBoundingClientRect();
    const itemRect = itemEl.getBoundingClientRect();

    // Check if element is hidden/scrolled out of view in the scrollable element
    if (categoriesListRef.current) {
      const scrollRect = categoriesListRef.current.getBoundingClientRect();
      const isScrollChild = categoriesListRef.current.contains(itemEl);
      if (isScrollChild) {
        // If it is completely out of the scroll window bounds, hide indicator
        if (itemRect.bottom < scrollRect.top || itemRect.top > scrollRect.bottom) {
          setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
          return;
        }
      }
    }

    const top = itemRect.top - containerRect.top + (itemRect.height / 2) - 3;
    const isIdChange = lastActiveId.current !== selectedCategoryId;
    lastActiveId.current = selectedCategoryId;

    setIndicatorStyle({
      position: "absolute",
      top: `${top}px`,
      right: "27px", // Moved left slightly to align perfectly inside the category item border
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      backgroundColor: "#3b82f6",
      boxShadow: "0 0 8px #3b82f6, 0 0 12px #3b82f6",
      opacity: 1,
      zIndex: 40,
      pointerEvents: "none",
      transition: isIdChange
        ? "top 0.3s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.2s ease"
        : "opacity 0.2s ease",
    });
  }, [selectedCategoryId]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [selectedCategoryId, sidebarOpen, categories, updateIndicator]);

  useEffect(() => {
    const scrollEl = categoriesListRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", updateIndicator, { passive: true });
      return () => scrollEl.removeEventListener("scroll", updateIndicator);
    }
  }, [selectedCategoryId, categories, updateIndicator]);

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
    selectCategory(fullCategory.id);
  };

  const handleTogglePin = async (categoryId: string, isPinned: boolean) => {
    setPinError(null);

    // Client-side validation: prevent pinning more than 3
    if (isPinned && categories.filter((c) => c.isPinned).length >= 3) {
      showToast("You can only pin up to 3 categories.", "error");
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
          showToast("You can only pin up to 3 categories.", "error");
        }
        return;
      }

      setCategories((prev) =>
        prev.map((c) => (c.id === categoryId ? { ...c, isPinned } : c))
      );
    } catch {
      showToast("Failed to update pin state.", "error");
    }
  };

  const handleSelectSearchResult = async (result: SearchResult) => {
    setIsSearchOpen(false);
    try {
      const res = await fetch(`/api/entries/${result.id}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setSelectedCategoryId(result.categoryId);
        setActiveEntry(json.data);
        setView("DETAIL");
      } else {
        showToast("Failed to load document details.", "error");
      }
    } catch {
      showToast("Network error loading document.", "error");
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
        showToast("Category renamed successfully.", "success");
      } else {
        showToast(result.error?.message ?? "Failed to rename category.", "error");
      }
    } catch {
      showToast("Network error renaming category.", "error");
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
          selectCategory(remaining[0]?.id ?? null);
        }

        setDeletingCategory(null);
        showToast("Category and all entries deleted successfully.", "success");
      } else {
        showToast(result.error?.message ?? "Failed to delete category.", "error");
      }
    } catch {
      showToast("Network error deleting category.", "error");
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
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
          className="flex items-center gap-1.5 w-full bg-white/5 border border-white/10 rounded-lg p-1.5 my-0.5 animate-in fade-in duration-100 backdrop-blur-sm"
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
            className="p-0.5 text-emerald-400 hover:text-emerald-300 transition flex-shrink-0"
            title="Save name"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditingCategoryId(null)}
            className="p-0.5 text-red-400 hover:text-red-300 transition flex-shrink-0"
            title="Cancel rename"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </form>
      );
    }

    return (
      <div
        key={category.id}
        data-category-id={category.id}
        className={`group relative flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-all duration-150 ${
          isSelected
            ? "bg-blue-500/15 border border-blue-500/20 shadow-sm shadow-blue-500/10"
            : "hover:bg-white/5 border border-transparent"
        }`}
      >
        <button
          onClick={() => selectCategory(category.id)}
          className={`flex flex-1 items-center gap-2.5 text-left transition min-w-0 ${
            isSelected ? "text-blue-300 font-semibold" : "text-neutral-400 hover:text-white"
          }`}
        >
          <Folder className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-blue-400" : "text-neutral-600"}`} />
          <span className="truncate">{category.name}</span>
        </button>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex-shrink-0 ml-1.5 transition-opacity duration-150">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleTogglePin(category.id, !category.isPinned);
            }}
            className="p-1 text-neutral-600 hover:text-white transition rounded hover:bg-white/5"
            title={category.isPinned ? "Unpin category" : "Pin category"}
          >
            <Pin className={`h-3.5 w-3.5 ${category.isPinned ? "fill-blue-500 text-blue-400" : "text-neutral-600"}`} />
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
              className="p-1 text-neutral-600 hover:text-white transition rounded hover:bg-white/5"
              title="Category options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {activeMenuCategoryId === category.id && (
              <div className="absolute right-0 mt-1 w-28 origin-top-right rounded-xl border border-white/10 bg-neutral-900/90 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategoryId(category.id);
                    setEditingName(category.name);
                    setActiveMenuCategoryId(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-neutral-300 hover:bg-white/10 hover:text-white transition font-medium"
                >
                  <Edit2 className="h-3 w-3 text-neutral-400" />
                  <span>Rename</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingCategory(category);
                    setActiveMenuCategoryId(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition font-medium"
                >
                  <Trash2 className="h-3 w-3" />
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#080a0f] font-sans text-neutral-200 select-none">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/8 blur-3xl" />
        <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-indigo-600/6 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-600/5 blur-3xl" />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#080a0f]/80 backdrop-blur-xl px-5 flex-shrink-0">
        {/* Toggle Button & Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-white/5 hover:text-white transition focus:outline-none"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft className="h-4.5 w-4.5" />
          </button>
          <div
            onClick={() => selectCategory(null)}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition"
            title="Go to Dashboard"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white text-sm shadow-lg shadow-blue-500/25">
              N
            </div>
            <span className="text-sm font-bold tracking-tight text-white">
              NexDocsHub
            </span>
          </div>
        </div>

        {/* Search trigger */}
        <div
          onClick={() => setIsSearchOpen(true)}
          className="relative w-full max-w-xs cursor-pointer group"
        >
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600 group-hover:text-neutral-400 transition" />
          <div className="w-full rounded-lg border border-white/[0.07] bg-white/[0.03] py-2 pl-9 pr-14 text-xs text-neutral-600 group-hover:text-neutral-400 group-hover:border-white/[0.12] group-hover:bg-white/[0.05] outline-none transition flex items-center justify-between select-none">
            <span>Search knowledge...</span>
            <kbd className="border border-white/10 bg-white/5 rounded px-1.5 py-0.5 text-[9px] font-sans flex items-center gap-0.5 select-none text-neutral-600">
              <span>Ctrl</span><span>K</span>
            </kbd>
          </div>
        </div>

        {/* Spacer */}
        <div className="w-24 h-8 flex-shrink-0" />
      </header>

      {/* Main Container */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          className={`relative border-r border-white/[0.06] bg-[#0a0c12]/60 backdrop-blur-xl flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${sidebarOpen ? "w-60 p-3" : "w-0 p-0 border-r-0 overflow-hidden"}`}
        >
          <div className="w-[216px] flex flex-col flex-1 h-full min-w-[216px]">
            {/* Header */}
            <div className="flex items-center justify-between px-1.5 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                Workspace
              </span>
              <button
                onClick={() => setIsOpenModal(true)}
                className="rounded-md p-1 text-neutral-600 hover:bg-white/5 hover:text-white transition"
                title="Add Category"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Pin Error */}
            {pinError && (
              <div className="px-2 mb-2 text-[10px] font-bold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                {pinError}
              </div>
            )}

            {/* Pinned Categories */}
            {categories.filter(c => c.isPinned).length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 px-1.5 mb-1.5">
                  <Pin className="h-2.5 w-2.5 text-blue-500 fill-blue-500" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500/70">
                    Pinned ({categories.filter(c => c.isPinned).length}/3)
                  </span>
                </div>
                <div className="space-y-0.5">
                  {categories.filter(c => c.isPinned).map((category) => renderCategoryItem(category))}
                </div>
              </div>
            )}

            {/* Separator */}
            {categories.filter(c => c.isPinned).length > 0 && categories.filter(c => !c.isPinned).length > 0 && (
              <div className="border-t border-white/[0.05] mb-2 mx-1.5" />
            )}

            {/* General Categories */}
            <div
              ref={categoriesListRef}
              className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10"
            >
              {categories.filter(c => c.isPinned).length > 0 && categories.filter(c => !c.isPinned).length > 0 && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-600 px-1.5 mb-1.5 block">
                  Folders
                </span>
              )}
              {categories.filter(c => !c.isPinned).map((category) => renderCategoryItem(category))}

              {categories.length === 0 && (
                <p className="px-2 py-4 text-xs text-neutral-700 italic">
                  No categories yet
                </p>
              )}
            </div>

            {/* Profile Section */}
            <div className="border-t border-white/[0.05] pt-3 mt-auto">
              <ProfileMenu user={user} />
            </div>
          </div>

          {/* Active Category Indicator Ball */}
          <div style={indicatorStyle} />
        </aside>

        {/* Content Area */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-transparent p-8">
          <AnimatePresence mode="wait">
            {categories.length === 0 ? (
              /* Empty State */
              <motion.div
                key="empty-state"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-1 flex-col items-center justify-center text-center max-w-lg mx-auto"
              >
                <div className="relative mb-8">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm text-neutral-500 shadow-2xl">
                    <FolderPlus className="h-9 w-9 text-neutral-600" />
                  </div>
                  <div className="absolute -inset-4 rounded-3xl bg-blue-500/5 blur-xl" />
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  Welcome to NexDocsHub
                </h2>
                <p className="mt-3 text-sm text-neutral-500 leading-relaxed max-w-sm">
                  Create your first category to start organizing your personal
                  knowledge base, learning logs, and architecture decisions.
                </p>
                <button
                  onClick={() => setIsOpenModal(true)}
                  className="mt-8 flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-6 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 duration-200"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create your first category</span>
                </button>
              </motion.div>
            ) : selectedCategoryId && selectedCategory ? (
              <motion.div
                key={`${selectedCategoryId}_${view}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-1 flex-col h-full overflow-hidden"
              >
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
              </motion.div>
            ) : (
              <motion.div
                key="no-selection"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-1 flex-col max-w-4xl mx-auto w-full pt-6 select-none"
              >
                {/* Header Greeting Banner */}
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-white/[0.01] p-8 md:p-10 mb-8 backdrop-blur-xl shadow-2xl">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
                  <div className="absolute bottom-0 left-1/3 -ml-16 -mb-16 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 px-3 py-1 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        <span>Workspace Dashboard</span>
                      </div>
                      <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight md:text-4xl">
                        Welcome back, <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent">{user.username}</span>!
                      </h2>
                      <p className="text-sm text-neutral-400 leading-relaxed max-w-lg">
                        Your privacy-first knowledge operating system is fully loaded. Select a folder to start editing notes, or use global search to find your files.
                      </p>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-3 flex-shrink-0">
                      <button
                        onClick={() => setIsOpenModal(true)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 px-4.5 py-2.5 text-xs font-bold text-white transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 hover:-translate-y-0.5 duration-200"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        <span>New Folder</span>
                      </button>
                      <button
                        onClick={() => setIsSearchOpen(true)}
                        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.12] px-4.5 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white transition hover:-translate-y-0.5 duration-200"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Global Search</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                  {/* Folders Card */}
                  <div 
                    onClick={() => setIsOpenModal(true)}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] p-6 transition-all duration-300 cursor-pointer hover:border-white/[0.10] hover:-translate-y-1 shadow-lg"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 group-hover:scale-110 transition duration-300">
                      <Folder className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-sm text-neutral-200 group-hover:text-white">Folders & Categories</h3>
                    <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
                      You have created {categories.length} folders. Click here to add a new category to group related documentation.
                    </p>
                  </div>

                  {/* Deep Search Card */}
                  <div 
                    onClick={() => setIsSearchOpen(true)}
                    className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] p-6 transition-all duration-300 cursor-pointer hover:border-white/[0.10] hover:-translate-y-1 shadow-lg"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition duration-300">
                      <Search className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-sm text-neutral-200 group-hover:text-white">Deep Knowledge Search</h3>
                    <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed">
                      Instantly query matches across titles, contents, tags, and files by pressing <kbd className="border border-white/10 bg-white/5 rounded px-1 text-[9px] font-sans">Ctrl + K</kbd> anywhere.
                    </p>
                  </div>

                  {/* Privacy Card */}
                  <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6 transition-all duration-300 shadow-lg">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-sm text-neutral-200">Vision & Purpose</h3>
                    <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed italic">
                      &ldquo;Knowledge should never be lost.&rdquo; NexDocsHub preserves your personal memory safely and securely.
                    </p>
                  </div>
                </div>

                {/* Keyboard Shortcuts & System status */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] p-6 backdrop-blur-sm">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-4">
                    Quick Controls Reference
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-neutral-400">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-neutral-400">Search Command Palette</span>
                      <kbd className="border border-white/10 bg-white/5 rounded px-2 py-0.5 font-sans text-neutral-500">
                        Ctrl + K
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <span className="text-neutral-400">Dismiss Modal / Close Dialog</span>
                      <kbd className="border border-white/10 bg-white/5 rounded px-2 py-0.5 font-sans text-neutral-500">
                        ESC
                      </kbd>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsOpenModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Global Cmd+K Search Modal */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Delete Category Confirmation */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm transform overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1017]/90 backdrop-blur-xl p-6 shadow-2xl shadow-black/50 transition-all animate-in scale-in duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 flex-shrink-0">
                <Trash2 className="h-4.5 w-4.5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">Delete Category?</h3>
                <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
                  You are about to permanently delete{" "}
                  <span className="font-semibold text-white">&ldquo;{deletingCategory.name}&rdquo;</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-red-900/30 bg-red-950/20 p-3 text-[11px] text-red-400 leading-normal flex items-start gap-2 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>This will permanently delete all entries and attached files in this category. This action cannot be undone.</span>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs font-semibold text-neutral-400 hover:bg-white/[0.07] hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 transition shadow-lg shadow-red-600/20"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === "success"
              ? "border-emerald-700/40 bg-emerald-950/80 text-emerald-300"
              : "border-red-800/40 bg-red-950/80 text-red-300"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );

  // Helper to handle Modal state
  function setIsOpenModal(open: boolean) {
    setIsModalOpen(open);
  }
}
