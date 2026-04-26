"use client";

import Link from "next/link";
import { Search, Bell, BookOpen, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

interface Props {
  user: { email: string; name: string };
}

export function Topbar({ user }: Props) {
  const { theme, toggle } = useTheme();

  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user.email.slice(0, 2).toUpperCase();

  const displayName = user.name || user.email;

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-5">
      {/* Search */}
      <div className="flex items-center gap-2 border border-border bg-muted/50 px-3 h-8 w-64">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          placeholder="Search"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden border border-border bg-muted px-1.5 text-[10px] text-muted-foreground sm:block">/</kbd>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">

        {/* Docs */}
        <Link href="/docs"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <BookOpen className="h-3.5 w-3.5" /> Docs
        </Link>

        {/* Help */}
        <Link href="/help"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          Help
        </Link>

        {/* Bell */}
        <button className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User pill */}
        <div className="flex items-center gap-2 border border-border bg-muted/40 pl-1 pr-3 h-8 ml-1">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-violet-600 text-[10px] font-bold text-white">
            {initials}
          </div>
          <span className="max-w-[140px] truncate text-xs font-medium text-foreground">
            {displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
