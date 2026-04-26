"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { APP_NAV_ITEMS, GITHUB_REPO_URL } from "@/components/app-nav-items";

type SidebarProps = {
  /** When set, sidebar becomes a slide-over on small screens controlled by this flag. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const info = await api.getWalletInfo();
        if (alive) setBalance(info.balanceSats);
      } catch {
        if (alive) setBalance(null);
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const isActive = (href: string) => pathname === href;
  const desktopW = collapsed ? "md:w-[52px]" : "md:w-[220px]";

  return (
    <aside
      className={cn(
        "relative z-50 flex h-screen shrink-0 flex-col border-r border-border bg-background font-mono text-[11px] tracking-widest text-muted-foreground transition-[width,transform] duration-300 ease-out",
        "fixed inset-y-0 left-0 w-[min(280px,88vw)] md:relative md:inset-auto",
        desktopW,
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-14 z-10 hidden h-6 w-6 items-center justify-center border border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground md:flex"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      <div className="flex h-12 items-center border-b border-border px-3">
        <Link
          href="/"
          onClick={() => onMobileClose?.()}
          className="flex min-w-0 items-center gap-2 text-foreground"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
          <span
            className={cn(
              "font-mono text-[13px] font-semibold tracking-tighter",
              collapsed ? "md:hidden" : ""
            )}
          >
            ShotenX
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-1 py-3">
        {APP_NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            onClick={() => onMobileClose?.()}
            className={cn(
              "flex items-center gap-2.5 border-l-2 py-2 pl-2 pr-1 transition-colors hover:bg-muted",
              isActive(href)
                ? "border-foreground bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className={cn("uppercase", collapsed ? "md:hidden" : "")}>{label}</span>
          </Link>
        ))}
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onMobileClose?.()}
          className="flex items-center gap-2.5 border-l-2 border-transparent py-2 pl-2 pr-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Github className="h-4 w-4 shrink-0" />
          <span className={cn("uppercase", collapsed ? "md:hidden" : "")}>GitHub</span>
        </a>
      </nav>

      <div className="border-t border-border p-2">
        {!collapsed && (
          <div className="mb-2 border border-border bg-muted/50 px-2 py-2">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Wallet</p>
            <p className="mt-1 font-mono text-sm text-foreground">
              {balance !== null ? `${balance.toLocaleString()} sats` : "—"}
            </p>
          </div>
        )}
        <Link
          href="/"
          onClick={() => onMobileClose?.()}
          className="flex w-full items-center gap-2 border border-transparent py-2 pl-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Home className="h-4 w-4 shrink-0" />
          <span className={cn("uppercase", collapsed ? "md:hidden" : "")}>Home</span>
        </Link>
      </div>
    </aside>
  );
}
