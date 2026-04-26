"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PenSquare,
  PlayCircle,
  Home,
  Store,
  BookOpen,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/marketplace", icon: Store, label: "Marketplace" },
  { href: "/create-agent", icon: PenSquare, label: "Create Agent" },
  { href: "/demo", icon: PlayCircle, label: "Demo" },
  { href: "/docs", icon: BookOpen, label: "Docs" },
  { href: "/help", icon: HelpCircle, label: "Help" },
];

export function Sidebar() {
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
  const w = collapsed ? "w-[52px]" : "w-[220px]";

  return (
    <aside
      className={cn(
        "relative flex h-screen shrink-0 flex-col border-r border-[#1a1a1a] bg-[#0a0a0a] font-mono text-[11px] tracking-widest text-[#555555] transition-[width] duration-300 ease-out",
        w
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-14 z-10 flex h-6 w-6 items-center justify-center border border-[#333333] bg-[#111111] text-[#888888] hover:border-white hover:text-white"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      <div className="flex h-12 items-center border-b border-[#1a1a1a] px-3">
        <Link href="/" className="flex items-center gap-2 text-[#ffffff]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M13 2L3 14h8l-1 8 10-12h-8l1-8z"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
            />
          </svg>
          {!collapsed && <span className="font-mono text-[13px] font-semibold tracking-tighter">ShotenX</span>}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-1 py-3">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={cn(
              "flex items-center gap-2.5 border-l-2 py-2 pl-2 pr-1 transition-colors hover:bg-[#1a1a1a]",
              isActive(href)
                ? "border-[#ffffff] bg-[#111111] text-[#ffffff]"
                : "border-transparent text-[#555555] hover:text-[#ffffff]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="uppercase">{label}</span>}
          </Link>
        ))}
      </nav>

      <div className="border-t border-[#1a1a1a] p-2">
        {!collapsed && (
          <div className="mb-2 border border-[#222222] bg-[#111111] px-2 py-2">
            <p className="text-[9px] uppercase tracking-widest text-[#555555]">Wallet</p>
            <p className="mt-1 font-mono text-sm text-[#ffffff]">
              {balance !== null ? `${balance.toLocaleString()} sats` : "—"}
            </p>
          </div>
        )}
        <Link
          href="/"
          className="flex w-full items-center gap-2 border border-transparent py-2 pl-2 text-[#555555] transition-colors hover:bg-[#1a1a1a] hover:text-[#ffffff]"
        >
          <Home className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="uppercase">Home</span>}
        </Link>
      </div>
    </aside>
  );
}
