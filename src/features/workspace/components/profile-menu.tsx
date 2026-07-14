"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronUp } from "lucide-react";

interface ProfileMenuProps {
  user: {
    username: string;
    email: string;
  };
}

export function ProfileMenu({ user }: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const userInitial = user.username.charAt(0).toUpperCase();

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-left transition-all hover:bg-white/[0.05] hover:border-white/[0.10] focus:outline-none group"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white text-xs flex-shrink-0 shadow-lg shadow-blue-500/20">
          {userInitial}
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <span className="truncate text-[11px] font-bold text-white leading-tight">
            {user.username}
          </span>
          <span className="truncate text-[9px] text-neutral-600 leading-none mt-0.5">
            {user.email}
          </span>
        </div>
        <ChevronUp
          className={`h-3.5 w-3.5 text-neutral-600 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-full origin-bottom-left rounded-xl border border-white/[0.08] bg-[#0e1017]/90 backdrop-blur-xl p-1.5 shadow-2xl shadow-black/50 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* User info */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 font-bold text-white text-sm flex-shrink-0 shadow-md shadow-blue-500/20">
              {userInitial}
            </div>
            <div className="min-w-0">
              <p className="truncate font-bold text-xs text-white">{user.username}</p>
              <p className="truncate text-[10px] text-neutral-500">{user.email}</p>
            </div>
          </div>

          <div className="my-1 border-t border-white/[0.06]" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-400 transition hover:bg-red-500/8 hover:text-red-300 focus:outline-none"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
