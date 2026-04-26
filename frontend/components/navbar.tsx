"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletConnect } from "@/components/wallet-connect";
import { createClient } from "@/lib/supabase";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/docs", label: "Docs" },
  { href: "/leaderboard", label: "Leaderboard" },
];

type UserInfo = { email: string; name: string; initials: string } | null;

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setReady(true);
      return;
    }

    const load = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      if (u) {
        const name = (u.user_metadata?.full_name as string | undefined) ?? "";
        const email = u.email ?? "";
        const initials = name
          ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : email.slice(0, 2).toUpperCase();
        setUser({ email, name, initials });
      } else {
        setUser(null);
      }
      setReady(true);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const name = (u.user_metadata?.full_name as string | undefined) ?? "";
        const email = u.email ?? "";
        const initials = name
          ? name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : email.slice(0, 2).toUpperCase();
        setUser({ email, name, initials });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-[#ffffff]"
        >
          <div className="flex h-7 w-7 items-center justify-center border border-[#333333] bg-[#000000]">
            <Zap className="h-4 w-4 text-[#ffffff]" />
          </div>
          ShotenX
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 text-sm transition-colors ${
                pathname === l.href
                  ? "font-medium text-[#ffffff]"
                  : "text-[#555555] hover:text-[#ffffff]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WalletConnect />
          <ThemeToggle />

          {!ready && <div className="h-8 w-24 animate-pulse rounded border border-[#222222] bg-[#111111]" />}

          {ready && user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 items-center gap-2 border border-[#333333] bg-[#111111] pl-1 pr-2.5 hover:border-[#555555]"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#333333] bg-[#000000] font-mono text-[10px] font-bold text-[#ffffff]">
                  {user.initials}
                </div>
                <span className="max-w-[120px] truncate text-xs font-medium text-[#cccccc]">
                  {user.name || user.email}
                </span>
                <ChevronDown className={`h-3 w-3 text-[#666666] ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-52 border border-[#333333] bg-[#111111] shadow-lg">
                    <div className="border-b border-[#222222] px-4 py-3">
                      <p className="truncate text-xs font-semibold text-[#ffffff]">{user.name || "Session"}</p>
                      <p className="truncate text-[11px] text-[#666666]">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full px-3 py-2 text-xs text-[#cccccc] hover:bg-[#1a1a1a]"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/agent-chat"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full px-3 py-2 text-xs text-[#cccccc] hover:bg-[#1a1a1a]"
                      >
                        Agent chat
                      </Link>
                      <Link
                        href="/create-agent"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full px-3 py-2 text-xs text-[#cccccc] hover:bg-[#1a1a1a]"
                      >
                        Create agent
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
