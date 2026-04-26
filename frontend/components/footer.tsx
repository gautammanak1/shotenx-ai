import Link from "next/link";
import { Zap, Github, BookOpen, MessageCircle } from "lucide-react";
import { GITHUB_REPO_URL } from "@/components/app-nav-items";

const FOOTER_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/agent-chat", label: "Agent chat" },
  { href: "/docs", label: "Docs" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/create-agent", label: "Create agent" },
  { href: "/alby", label: "Alby & L402" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              <Zap className="h-4 w-4 text-foreground" />
              <span className="font-semibold text-foreground">ShotenX</span>
              <span className="normal-case tracking-normal text-muted-foreground">Payment = access</span>
            </div>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-4 w-4 shrink-0" />
              Source on GitHub
            </a>
          </div>
          <nav className="flex flex-col gap-3 sm:items-end">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Explore</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end sm:gap-x-6 sm:gap-y-2">
              {FOOTER_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <a
                href={`${GITHUB_REPO_URL}/blob/main/readme.md`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Readme
              </a>
              <a
                href={`${GITHUB_REPO_URL}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Issues
              </a>
            </div>
          </nav>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
          Lightning · L402 · MVP
        </p>
      </div>
    </footer>
  );
}
