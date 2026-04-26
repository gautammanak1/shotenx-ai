"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ArrowLeftRight,
  PenSquare, PlayCircle, LogOut, Zap, Store, BookOpen, HelpCircle
} from "lucide-react";
import { createClient } from "@/lib/supabase";

const NAV = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions",  icon: ArrowLeftRight,  label: "Transactions" },
  { href: "/marketplace",   icon: Store,           label: "Marketplace" },
  { href: "/create-agent",  icon: PenSquare,       label: "Create Agent" },
  { href: "/demo",          icon: PlayCircle,      label: "Demo" },
  { href: "/docs",          icon: BookOpen,        label: "Docs" },
  { href: "/help",          icon: HelpCircle,      label: "Help" },
];

const PROVIDER = [
  { href: "/register", icon: PenSquare, label: "Register API" }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (href: string) => pathname === href;

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.push("/");
  };

  return (
    <aside className="flex h-screen w-[196px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-sidebar-border px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sm text-sidebar-foreground">
          <div className="flex h-6 w-6 items-center justify-center bg-blue-600">
            <Zap className="h-3.5 w-3.5 fill-white text-white" />
          </div>
          ShotenX AI
        </Link>
      </div>

      {/* Register CTA */}
      <div className="px-3 pt-3">
        <Link
          href="/register"
          className="flex w-full items-center justify-center gap-1.5 bg-blue-600 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
        >
          + Register API
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 text-sm transition-colors ${
              isActive(href)
                ? "bg-accent text-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-4">
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Provider
          </p>
          {PROVIDER.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 text-sm transition-colors ${
                isActive(href)
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
