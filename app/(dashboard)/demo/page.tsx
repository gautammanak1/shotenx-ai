"use client";

import { useState } from "react";
import { Zap, CheckCircle2, Circle } from "lucide-react";

const STEPS = [
  { icon: "🤖", label: "Agent calls endpoint", log: '{ "action": "call", "service": "Document Summarizer", "endpoint": "POST /api/summarize" }' },
  { icon: "🔒", label: "Server returns HTTP 402 + invoice", log: '{ "status": 402, "invoice": "lnbc500n1p3xkw8pp5...", "amount": "50 sats" }' },
  { icon: "⚡", label: "Agent wallet detects invoice", log: '{ "wallet": "detected invoice", "amount": "50 sats", "auto_pay": true }' },
  { icon: "💸", label: "Lightning payment sent", log: '{ "payment": "sent", "preimage": "3f9a8c...c12b", "fee": "0 sats" }' },
  { icon: "✅", label: "Payment verified → token issued", log: '{ "token": "Bearer eyJhbGci...", "access": "granted", "expires": "1h" }' },
  { icon: "📄", label: "Agent receives result", log: '{ "result": "Summary: The document covers Q3 financials, showing 24% YoY growth...", "words": 142 }' }
];

export default function DemoPage() {
  const [active, setActive] = useState(-1);
  const [running, setRunning] = useState(false);
  const done = active === STEPS.length - 1;

  const runDemo = async () => {
    if (running) return;
    setRunning(true);
    setActive(-1);
    for (let i = 0; i < STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 900));
      setActive(i);
    }
    setRunning(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Live Demo</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            An AI agent summarizes a document and pays 50 sats — in under 1 second.
          </p>
        </div>
        <button
          onClick={runDemo}
          disabled={running}
          className="btn-primary flex items-center gap-2 py-2 px-4 disabled:opacity-50"
        >
          <Zap className="h-4 w-4 fill-white" />
          {running ? "Running..." : done ? "Run Again" : "Run Demo"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Steps */}
        <div className="border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-sm font-semibold text-foreground">Payment Loop — L402</h2>
            <p className="text-xs text-muted-foreground mt-0.5">6-step Lightning payment flow</p>
          </div>
          <div className="p-4 space-y-2">
            {STEPS.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 border px-4 py-3 transition-all duration-300 ${
                  active >= i
                    ? "border-blue-500/40 bg-blue-50 dark:bg-blue-500/5 opacity-100"
                    : "border-border opacity-35"
                }`}
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center text-sm ${
                  active >= i ? "bg-blue-100 dark:bg-blue-500/10" : "bg-muted"
                }`}>
                  {active >= i ? s.icon : <Circle className="h-3 w-3 text-muted-foreground" />}
                </div>
                <p className={`flex-1 text-sm ${active >= i ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </p>
                {active >= i && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />}
              </div>
            ))}
          </div>
        </div>

        {/* Terminal */}
        <div className="border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-4 py-2.5">
            <div className="h-2.5 w-2.5 bg-red-400" />
            <div className="h-2.5 w-2.5 bg-yellow-400" />
            <div className="h-2.5 w-2.5 bg-green-400" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">agent-terminal</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-3 min-h-[340px] bg-[#0d0d14] dark:bg-[#07070d]">
            {active === -1 && (
              <p className="text-zinc-500">$ waiting for demo to start...</p>
            )}
            {STEPS.slice(0, active + 1).map((s, i) => (
              <div key={i} className="space-y-0.5 animate-fade-slide">
                <p className="text-zinc-500">$ step {i + 1} — {s.label.toLowerCase()}</p>
                <p className="text-green-400 break-all leading-relaxed">{s.log}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* End banner */}
      {done && (
        <div className="animate-fade-in flex items-center justify-center gap-3 border border-green-500/30 bg-green-50 dark:bg-green-500/5 py-4 text-sm font-semibold text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          Provider received 50 sats ✅ — Settlement: instant
        </div>
      )}
    </div>
  );
}
