"use client";

import { Sidebar } from "@/components/sidebar";
import { WalletConnect } from "@/components/wallet-connect";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  title?: string;
  /** Full-height chat: no outer padding; child controls scroll + composer. */
  chatShell?: boolean;
}

export function PublicLayout({ children, title, chatShell }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-5">
          <span className="text-sm font-semibold text-foreground">{title ?? ""}</span>
          <div className="flex items-center gap-2">
            <WalletConnect />
            <ThemeToggle />
          </div>
        </header>
        <main
          className={cn(
            "flex-1",
            chatShell ? "flex min-h-0 flex-col overflow-hidden" : "overflow-y-auto p-6"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
