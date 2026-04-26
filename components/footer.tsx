import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary fill-primary" />
          <span className="font-semibold text-foreground">ShotenX AI</span>
          <span>— Payment = Access. No login required.</span>
        </div>
        <span>Built on Lightning ⚡</span>
      </div>
    </footer>
  );
}
