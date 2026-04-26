"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { terminalLine } from "@/lib/animations";

export type TerminalLineType = "command" | "output" | "success" | "error" | "info";

export interface TerminalLine {
  text: string;
  delay?: number;
  charDelay?: number;
  type: TerminalLineType;
}

const PREFIX: Record<TerminalLineType, string> = {
  command: "> ",
  output: "",
  success: "✓ ",
  error: "✗ ",
  info: "→ ",
};

const LINE_CLASS: Record<TerminalLineType, string> = {
  command: "text-[#ffffff]",
  output: "text-[#aaaaaa]",
  success: "text-[#ffffff]",
  error: "text-[#555555]",
  info: "text-[#888888]",
};

export const btcAgentSequence: TerminalLine[] = [
  { type: "command", text: "shotenx connect --agent summarizer-v2", delay: 500 },
  { type: "output", text: "Connecting to Lightning Network...", delay: 800 },
  { type: "info", text: "Node: 03a1b2...f8e9 | Capacity: 0.05 BTC", delay: 400 },
  { type: "success", text: "Agent online. Awaiting requests.", delay: 300 },
  { type: "command", text: "shotenx pay --invoice lnbc10sat --memo summarize", delay: 1000 },
  { type: "output", text: "Generating invoice: lnbc10n1p...", delay: 600 },
  { type: "output", text: "Amount: 10 sats | Fee: 0 sats", delay: 200 },
  { type: "info", text: "Waiting for payment confirmation...", delay: 800 },
  { type: "success", text: "Payment settled. HTLC resolved.", delay: 400 },
  { type: "output", text: "Processing request...", delay: 500 },
  { type: "success", text: "Result delivered. Earned: 10 sats", delay: 300 },
];

export type TerminalProps = {
  lines: TerminalLine[];
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  title?: string;
  /** px height of scroll area */
  height?: number;
};

type RenderedLine = { id: string; fullText: string; display: string; type: TerminalLineType; done: boolean };

export function Terminal({
  lines,
  autoPlay = true,
  loop = false,
  className = "",
  title = "shotenx-agent ~ terminal",
  height = 400,
}: TerminalProps) {
  const [queue, setQueue] = useState<RenderedLine[]>([]);
  const [cursorOn, setCursorOn] = useState(true);
  const lineIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  const startSequence = useCallback(() => {
    cancelled.current = false;
    lineIndexRef.current = 0;
    charIndexRef.current = 0;
    setQueue([]);
    const runLine = (idx: number) => {
      if (cancelled.current || idx >= lines.length) {
        if (loop && !cancelled.current && idx >= lines.length) {
          timeoutRef.current = setTimeout(() => startSequence(), 1200);
        }
        return;
      }
      const spec = lines[idx];
      const delay = spec.delay ?? 0;
      const charDelay = spec.charDelay ?? 28;
      const full = `${PREFIX[spec.type]}${spec.text}`;
      const id = `ln-${idx}-${Date.now()}`;

      timeoutRef.current = setTimeout(() => {
        if (cancelled.current) return;
        setQueue((prev) => [...prev, { id, fullText: full, display: "", type: spec.type, done: false }]);

        let pos = 0;
        const tick = () => {
          if (cancelled.current) return;
          pos += 1;
          const slice = full.slice(0, pos);
          setQueue((prev) =>
            prev.map((l) => (l.id === id ? { ...l, display: slice, done: pos >= full.length } : l))
          );
          if (pos < full.length) {
            timeoutRef.current = setTimeout(tick, charDelay);
          } else {
            timeoutRef.current = setTimeout(() => runLine(idx + 1), 120);
          }
        };
        tick();
      }, delay);
    };
    runLine(0);
  }, [lines, loop]);

  useEffect(() => {
    if (!autoPlay) return;
    startSequence();
    return () => {
      cancelled.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [autoPlay, startSequence]);

  useEffect(() => {
    const id = setInterval(() => setCursorOn((c) => !c), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] font-mono text-[12px] leading-relaxed text-[#aaaaaa] ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff 2px, #ffffff 4px)",
        }}
      />
      <div className="relative flex items-center gap-2 border-b border-[#1a1a1a] px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-[#333333]" />
        <span className="h-2 w-2 rounded-full bg-[#444444]" />
        <span className="h-2 w-2 rounded-full bg-[#555555]" />
        <span className="flex-1 text-center text-[11px] tracking-wide text-[#555555]">{title}</span>
      </div>
      <div
        className="relative overflow-y-auto p-3"
        style={{ height, maxHeight: height }}
      >
        <AnimatePresence initial={false}>
          {queue.map((line) => (
            <motion.pre
              key={line.id}
              variants={terminalLine}
              initial="hidden"
              animate="visible"
              className={`mb-1 whitespace-pre-wrap break-words ${LINE_CLASS[line.type]}`}
            >
              {line.display}
              {!line.done && line.display.length > 0 ? (
                <span className={cursorOn ? "opacity-100" : "opacity-0"}>█</span>
              ) : null}
            </motion.pre>
          ))}
        </AnimatePresence>
        {queue.length === 0 ? (
          <span className={`inline-block ${cursorOn ? "opacity-100" : "opacity-0"} text-[#ffffff]`}>█</span>
        ) : null}
      </div>
    </div>
  );
}

export function MiniTerminal({
  lines,
  className = "",
  height = 200,
}: {
  lines: TerminalLine[];
  className?: string;
  /** Scroll area height in px (default 200) */
  height?: number;
}) {
  return <Terminal lines={lines} autoPlay height={height} className={className} title="preview" />;
}
