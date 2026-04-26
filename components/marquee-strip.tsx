"use client";

import Marquee from "react-fast-marquee";

const DEFAULT =
  "LIGHTNING FAST · 0 FEES · AGENT NATIVE · OPEN SOURCE · PER-REQUEST SATS · L402 · ";

export function MarqueeStrip({ text = DEFAULT }: { text?: string }) {
  const segment = `${text}`.repeat(4);
  return (
    <div className="h-9 w-full overflow-hidden border-y border-[#1a1a1a] bg-[#ffffff] text-[#000000]">
      <Marquee speed={40} gradient={false} className="font-mono text-[11px] font-medium tracking-widest">
        <span className="mx-8">{segment}</span>
      </Marquee>
    </div>
  );
}
