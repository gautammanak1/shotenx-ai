"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, ChevronDown, Menu, X, Github } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletConnect } from "@/components/wallet-connect";
import { createClient } from "@/lib/supabase";
import { GITHUB_REPO_URL } from "@/components/app-nav-items";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/docs", label: "Docs" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/agent-chat", label: "Agent chat" },
  { href: "/create-agent", label: "Create agent" },
];

type UserInfo = { email: string; name: string; initials: string } | null;

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

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
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 font-mono text-sm font-semibold tracking-tight text-foreground"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center border border-border bg-card">
            <Zap className="h-4 w-4 text-foreground" />
          </div>
          <span className="hidden sm:inline">ShotenX</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors",
                pathname === l.href
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Link
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="GitHub repository"
          >
            <Github className="h-4 w-4" />
          </Link>
          <WalletConnect compact />
          <ThemeToggle />
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {!ready && <div className="hidden h-8 w-24 animate-pulse rounded border border-border bg-muted sm:block" />}

          {ready && user && (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-8 items-center gap-2 border border-border bg-card pl-1 pr-2.5 hover:border-muted-foreground"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-border bg-background font-mono text-[10px] font-bold text-foreground">
                  {user.initials}
                </div>
                <span className="max-w-[100px] truncate text-xs font-medium text-muted-foreground lg:max-w-[140px]">
                  {user.name || user.email}
                </span>
                <ChevronDown className={`h-3 w-3 text-muted-foreground ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-52 border border-border bg-card shadow-lg">
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-xs font-semibold text-foreground">{user.name || "Session"}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/agent-chat"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
                      >
                        Agent chat
                      </Link>
                      <Link
                        href="/create-agent"
                        onClick={() => setMenuOpen(false)}
                        className="flex w-full px-3 py-2 text-xs text-muted-foreground hover:bg-muted"
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

      {mobileNavOpen && (
        <div className="border-t border-border bg-background px-3 py-3 md:hidden">
          <nav className="flex flex-col gap-1 font-mono text-sm">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2.5 transition-colors",
                  pathname === l.href ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2.5 text-muted-foreground hover:bg-muted"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
