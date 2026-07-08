"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, User as UserIcon, ChevronDown } from "lucide-react";

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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-1.5 pr-3 text-sm text-neutral-300 transition hover:border-neutral-700 hover:bg-neutral-900 hover:text-white focus:outline-none"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 font-semibold text-white">
          {userInitial}
        </div>
        <span className="max-w-[100px] truncate font-medium">
          {user.username}
        </span>
        <ChevronDown className="h-4 w-4 text-neutral-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-neutral-800 bg-neutral-900 p-2 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2.5">
            <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
              Signed in as
            </p>
            <p className="mt-1 truncate font-semibold text-sm text-white">
              {user.username}
            </p>
            <p className="truncate text-xs text-neutral-400 mt-0.5">
              {user.email}
            </p>
          </div>

          <div className="my-1 border-t border-neutral-800" />

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300 focus:outline-none"
          >
            <LogOut className="h-4 w-4" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
