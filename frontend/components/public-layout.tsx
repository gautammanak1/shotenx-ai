"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, Github } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { GITHUB_REPO_URL } from "@/components/app-nav-items";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  title?: string;
  /** Full-height chat: no outer padding; child controls scroll + composer. */
  chatShell?: boolean;
}

export function PublicLayout({ children, title, chatShell }: Props) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}
      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 min-h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:px-5">
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
            aria-label="Open navigation menu"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title ?? ""}</span>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="GitHub repository"
            >
              <Github className="h-4 w-4" />
            </Link>
            <WalletConnect compact />
            <ThemeToggle />
          </div>
        </header>
        <main
          className={cn(
            "flex-1",
            chatShell ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto p-4 sm:p-6"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
