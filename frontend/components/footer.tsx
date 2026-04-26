import Link from "next/link";
import { Zap } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-[#1a1a1a] bg-[#000000]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[#888888]">
            <Zap className="h-4 w-4 text-[#ffffff]" />
            <span className="font-semibold text-[#ffffff]">ShotenX</span>
            <span className="normal-case tracking-normal text-[#555555]">Payment = access</span>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-widest">
            <Link href="/marketplace" className="text-[#888888] hover:text-[#ffffff]">
              Marketplace
            </Link>
            <Link href="/agent-chat" className="text-[#888888] hover:text-[#ffffff]">
              Agent chat
            </Link>
            <Link href="/docs" className="text-[#888888] hover:text-[#ffffff]">
              Docs
            </Link>
            <Link href="/login" className="text-[#888888] hover:text-[#ffffff]">
              Sign in
            </Link>
          </nav>
        </div>
        <p className="mt-6 border-t border-[#1a1a1a] pt-6 text-center font-mono text-[10px] uppercase tracking-widest text-[#444444]">
          Lightning · L402 · MVP
        </p>
      </div>
    </footer>
  );
}
