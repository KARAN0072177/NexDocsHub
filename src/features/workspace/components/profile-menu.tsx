"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown } from "lucide-react";

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
        className="flex w-full items-center gap-2.5 rounded-xl border border-neutral-900 bg-neutral-900/10 p-2 text-left text-sm text-neutral-300 transition hover:bg-neutral-900 hover:text-white focus:outline-none"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-semibold text-white flex-shrink-0 shadow-md shadow-blue-650/10">
          {userInitial}
        </div>
        <div className="flex flex-1 flex-col min-w-0">
          <span className="truncate text-xs font-bold text-white leading-tight">
            {user.username}
          </span>
          <span className="truncate text-[10px] text-neutral-500 leading-none mt-0.5">
            {user.email}
          </span>
        </div>
        <ChevronDown
          className="h-4 w-4 text-neutral-500 transition-transform duration-200 flex-shrink-0 ml-auto"
          style={{ transform: isOpen ? "rotate(180deg)" : "none" }}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-full origin-bottom-left rounded-xl border border-neutral-900 bg-neutral-950 p-1.5 shadow-2xl focus:outline-none z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3.5 py-2.5">
            <p className="text-[10px] text-neutral-550 font-bold uppercase tracking-wider">
              Account Settings
            </p>
            <p className="mt-1 truncate font-bold text-xs text-white">
              {user.username}
            </p>
            <p className="truncate text-[10px] text-neutral-500 mt-0.5">
              {user.email}
            </p>
          </div>

          <div className="my-1 border-t border-neutral-900" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-450 transition hover:bg-red-500/5 hover:text-red-305 focus:outline-none"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
