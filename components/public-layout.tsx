"use client";

import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";

interface Props {
  children: React.ReactNode;
  title?: string;
}

export function PublicLayout({ children, title }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Public topbar — no auth required */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-5">
          <span className="text-sm font-semibold text-foreground">{title ?? ""}</span>
          <div className="flex items-center gap-2">
            <WalletConnect />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
