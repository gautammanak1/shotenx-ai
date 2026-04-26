"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Zap, LogOut, ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { WalletConnect } from "@/components/wallet-connect";
import { createClient } from "@/lib/supabase";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/docs",        label: "Docs" },
  { href: "/leaderboard", label: "Leaderboard" },
];

type UserInfo = { email: string; name: string; initials: string } | null;

export function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser]           = useState<UserInfo>(null);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [ready, setReady]         = useState(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setReady(true); return; }

    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const name     = (u.user_metadata?.full_name as string | undefined) ?? "";
        const email    = u.email ?? "";
        const initials = name
          ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
          : email.slice(0, 2).toUpperCase();
        setUser({ email, name, initials });
      } else {
        setUser(null);
      }
      setReady(true);
    };

    void load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u        = session.user;
        const name     = (u.user_metadata?.full_name as string | undefined) ?? "";
        const email    = u.email ?? "";
        const initials = name
          ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
          : email.slice(0, 2).toUpperCase();
        setUser({ email, name, initials });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-[#ffffff]">
          <div className="flex h-7 w-7 items-center justify-center border border-[#333333] bg-[#000000]">
            <Zap className="h-4 w-4 text-[#ffffff]" />
          </div>
          ShotenX
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 text-sm transition-colors ${
                pathname === l.href
                  ? "font-medium text-[#ffffff]"
                  : "text-[#555555] hover:text-[#ffffff]"
              }`}>
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <WalletConnect />
          <ThemeToggle />

          {/* Skeleton while loading */}
          {!ready && (
            <div className="h-8 w-28 animate-pulse bg-muted" />
          )}

          {/* Logged-in user pill */}
          {ready && user && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 border border-border bg-muted/40 pl-1 pr-2.5 h-8 hover:bg-muted transition-colors"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center border border-[#333333] bg-[#000000] font-mono text-[10px] font-bold text-[#ffffff]">
                  {user.initials}
                </div>
                <span className="max-w-[120px] truncate text-xs font-medium text-foreground">
                  {user.name || user.email}
                </span>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <>
                  {/* backdrop */}
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-52 border border-[#333333] bg-[#111111] shadow-lg">
                    <div className="border-b border-border px-4 py-3">
                      <p className="text-xs font-semibold text-foreground truncate">{user.name || "Account"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <Link href="/dashboard" onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                        Dashboard
                      </Link>
                      <Link href="/agent-chat" onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                        Agent Chat
                      </Link>
                      <Link href="/create-agent" onClick={() => setMenuOpen(false)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors">
                        Create Agent
                      </Link>
                    </div>
                    <div className="border-t border-border p-1">
                      <button onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[#888888] hover:bg-[#1a1a1a] hover:text-[#ffffff] transition-colors">
                        <LogOut className="h-3.5 w-3.5" /> Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Logged-out buttons */}
          {ready && !user && (
            <>
              <Link href="/login"
                className="border border-border bg-card px-4 py-1.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Sign in
              </Link>
              <Link href="/login"
                className="bg-[#ffffff] px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest text-[#000000] hover:bg-[#dddddd] active:scale-[0.98]">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
