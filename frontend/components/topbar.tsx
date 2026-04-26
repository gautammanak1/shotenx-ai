"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

interface Props {
  user: { email: string; name: string };
}

export function Topbar({ user }: Props) {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  const displayName = user.name || user.email || "Guest";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user.email || "SX").replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "SX";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[#1a1a1a] bg-[#0a0a0a] px-4 font-mono text-[11px]">
      <nav className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-widest text-[#888888]">
        <span className="text-[#444444]">~</span>{" "}
        <span className="text-[#ffffff]">{pathname || "/"}</span>
      </nav>

      <div className="flex items-center gap-1">
        <Link
          href="/docs"
          className="hidden items-center gap-1 px-2 py-1.5 text-[#555555] transition-colors hover:bg-[#111111] hover:text-[#ffffff] sm:flex"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="uppercase tracking-widest">Docs</span>
        </Link>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center text-[#555555] transition-colors hover:bg-[#111111] hover:text-[#ffffff]"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center border border-[#333333] text-[#888888] transition-colors hover:border-white hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="ml-1 flex items-center gap-2 border border-[#222222] bg-[#111111] pl-1 pr-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#333333] bg-[#000000] text-[10px] font-bold text-[#ffffff]">
            {initials}
          </div>
          <span className="max-w-[120px] truncate text-[11px] text-[#aaaaaa]">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
