"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Github, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";
import { GITHUB_REPO_URL } from "@/components/app-nav-items";

interface Props {
  user: { email: string; name: string };
  onOpenMobileNav?: () => void;
}

export function Topbar({ user, onOpenMobileNav }: Props) {
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
    <header className="flex h-12 min-h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-2 font-mono text-[11px] sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
        {onOpenMobileNav ? (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        ) : null}
        <nav className="min-w-0 truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground sm:text-[11px]">
          <span className="text-muted-foreground/70">~</span>{" "}
          <span className="text-foreground">{pathname || "/"}</span>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
        <Link
          href="/docs"
          className="hidden items-center gap-1 px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span className="hidden uppercase tracking-widest lg:inline">Docs</span>
        </Link>

        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:h-8 sm:w-8"
          aria-label="GitHub repository"
        >
          <Github className="h-4 w-4" />
        </a>

        <button
          type="button"
          className="hidden h-8 w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggle}
          className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground transition-colors hover:border-foreground hover:text-foreground sm:h-8 sm:w-8"
          aria-label="Toggle light or dark theme"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="ml-0.5 flex max-w-[min(140px,40vw)] items-center gap-1.5 border border-border bg-muted/40 py-0.5 pl-1 pr-1.5 sm:max-w-[200px] sm:gap-2 sm:pl-1 sm:pr-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-background text-[10px] font-bold text-foreground">
            {initials}
          </div>
          <span className="min-w-0 truncate text-[10px] text-muted-foreground sm:text-[11px]">{displayName}</span>
        </div>
      </div>
    </header>
  );
}
