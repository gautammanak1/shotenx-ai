"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Copy, Check, Menu, X } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";

const SECTIONS = [
  { id: "overview",   label: "Overview" },
  { id: "quickstart", label: "Quickstart" },
  { id: "auth",       label: "Authentication" },
  { id: "endpoints",  label: "API Endpoints" },
  { id: "l402",       label: "L402 Protocol" },
  { id: "errors",     label: "Error Codes" },
  { id: "sdks",       label: "SDKs & Tools" },
];

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative my-3 border border-border bg-[#0d0d14] dark:bg-[#07070d]">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
        <span className="text-[10px] font-mono text-muted-foreground">{lang}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3 text-xs text-green-400 font-mono leading-relaxed">{code}</pre>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground border-b border-border pb-2">{title}</h2>
      {children}
    </div>
  );
}

function DocsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("section") ?? "overview";
  const [mobileOpen, setMobileOpen] = useState(false);

  const setActive = (id: string) => {
    router.push(`/docs?section=${id}`, { scroll: false });
    setMobileOpen(false);
  };

  return (
    <PublicLayout title="Documentation">
      <div className="flex gap-8 max-w-5xl">

        {/* Mobile section picker */}
        <div className="mb-4 flex items-center justify-end md:hidden">
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {mobileOpen ? <X className="h-3.5 w-3.5" /> : <Menu className="h-3.5 w-3.5" />}
            {SECTIONS.find((s) => s.id === active)?.label ?? "Overview"}
          </button>
        </div>

        {mobileOpen && (
          <nav className="mb-4 border border-border bg-card p-2 space-y-0.5 md:hidden">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`flex w-full items-center gap-2 px-2.5 py-2 text-sm transition-colors ${active === s.id ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${active === s.id ? "rotate-90" : ""}`} />
                {s.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden w-44 shrink-0 md:block">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Documentation</p>
            <nav className="space-y-0.5">
              {SECTIONS.map((s) => (
                <button key={s.id} onClick={() => setActive(s.id)}
                  className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-sm transition-colors ${active === s.id ? "bg-accent text-foreground font-medium" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>
                  <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${active === s.id ? "rotate-90" : ""}`} />
                  {s.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 space-y-8 min-w-0">

            {active === "overview" && (
              <Section title="Overview">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ShotenX AI is a Lightning-native API marketplace where AI agents discover services, pay per request in sats, and receive results instantly — no API keys, no accounts, no subscriptions.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    { label: "Protocol",      val: "L402 (HTTP 402 + Lightning)" },
                    { label: "Payment unit",  val: "Satoshis (sats)" },
                    { label: "Avg latency",   val: "< 1 second" },
                    { label: "Auth required", val: "None — payment = access" },
                  ].map(({ label, val }) => (
                    <div key={label} className="border border-border bg-card p-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-foreground">{val}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {active === "quickstart" && (
              <Section title="Quickstart">
                <p className="text-sm text-muted-foreground">Get your first paid API response in under 2 minutes.</p>
                <div className="space-y-4 mt-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">1. Discover available services</p>
                    <CodeBlock lang="bash" code={`curl https://api.shotenx.ai/api/agents`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">2. Call an endpoint — receive HTTP 402</p>
                    <CodeBlock lang="bash" code={`curl -X POST https://api.shotenx.ai/api/summarize \\\n  -H "Content-Type: application/json" \\\n  -d '{"text": "Your document here..."}'`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">3. Pay the invoice and retry with token</p>
                    <CodeBlock lang="bash" code={`curl -X POST https://api.shotenx.ai/api/summarize \\\n  -H "Content-Type: application/json" \\\n  -H "x-payment-token: <checkout_id>" \\\n  -d '{"text": "Your document here..."}'`} />
                  </div>
                </div>
              </Section>
            )}

            {active === "auth" && (
              <Section title="Authentication">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ShotenX AI uses the <span className="font-semibold text-foreground">L402 protocol</span> — no API keys needed. Every request is authenticated by payment.
                </p>
                <div className="mt-3 space-y-3">
                  <div className="border border-border bg-card p-4">
                    <p className="text-xs font-semibold text-foreground mb-1">How it works</p>
                    <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                      <li>Make a request to any paid endpoint</li>
                      <li>Receive <code className="text-blue-400">HTTP 402</code> with a Lightning invoice</li>
                      <li>Pay the invoice via your Lightning wallet</li>
                      <li>Retry the request with <code className="text-blue-400">x-payment-token</code> header</li>
                      <li>Receive the result</li>
                    </ol>
                  </div>
                  <CodeBlock lang="http" code={`HTTP/1.1 402 Payment Required\nContent-Type: application/json\n\n{\n  "l402": {\n    "checkoutId": "chk_abc123",\n    "invoice": "lnbc500n1p3xkw8pp5...",\n    "amountSats": 50\n  }\n}`} />
                </div>
              </Section>
            )}

            {active === "endpoints" && (
              <Section title="API Endpoints">
                <div className="space-y-3">
                  {[
                    { method: "GET",  path: "/api/agents",                      desc: "List all available agents/services",       auth: false },
                    { method: "POST", path: "/api/payments/checkout",            desc: "Create a Lightning checkout for an agent", auth: false },
                    { method: "POST", path: "/api/payments/:id/simulate-settle", desc: "Simulate payment settlement (dev only)",   auth: false },
                    { method: "POST", path: "/api/tools/summarize",              desc: "Summarize text — L402 protected",          auth: true  },
                  ].map(({ method, path, desc, auth }) => (
                    <div key={path} className="border border-border bg-card p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold font-mono ${method === "GET" ? "bg-green-500/10 text-green-400" : "bg-blue-500/10 text-blue-400"}`}>
                          {method}
                        </span>
                        <code className="text-sm font-mono text-foreground">{path}</code>
                        {auth && <span className="ml-auto text-[10px] text-yellow-500 border border-yellow-500/30 px-1.5 py-0.5">L402</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {active === "l402" && (
              <Section title="L402 Protocol">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  L402 is an open standard combining HTTP 402 with Lightning Network invoices. It enables machine-to-machine micropayments with zero friction.
                </p>
                <CodeBlock lang="javascript" code={`// Example: Auto-pay L402 with a Lightning wallet\nconst res = await fetch('/api/tools/summarize', {\n  method: 'POST',\n  body: JSON.stringify({ text: 'Summarize this...' })\n});\n\nif (res.status === 402) {\n  const { l402 } = await res.json();\n  await wallet.payInvoice(l402.invoice);\n  const result = await fetch('/api/tools/summarize', {\n    method: 'POST',\n    headers: { 'x-payment-token': l402.checkoutId },\n    body: JSON.stringify({ text: 'Summarize this...' })\n  });\n}`} />
              </Section>
            )}

            {active === "errors" && (
              <Section title="Error Codes">
                <div className="border border-border bg-card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Code</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Meaning</th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { code: "402", meaning: "Payment required", action: "Pay the Lightning invoice and retry" },
                        { code: "400", meaning: "Bad request",       action: "Check your request body" },
                        { code: "404", meaning: "Agent not found",   action: "Verify the agent ID" },
                        { code: "408", meaning: "Payment expired",   action: "Create a new checkout" },
                        { code: "500", meaning: "Server error",      action: "Retry or contact support" },
                      ].map((r, i, arr) => (
                        <tr key={r.code} className={i < arr.length - 1 ? "border-b border-border" : ""}>
                          <td className="px-4 py-3 font-mono text-sm font-bold text-blue-400">{r.code}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{r.meaning}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{r.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            {active === "sdks" && (
              <Section title="SDKs & Tools">
                <p className="text-sm text-muted-foreground">Compatible tools and wallets for L402 payments.</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[
                    { name: "Alby Wallet",                 desc: "Browser extension with L402 support" },
                    { name: "MoneyDevKit",                 desc: "SDK for adding L402 to your API" },
                    { name: "LNC (Lightning Node Connect)", desc: "Connect your own Lightning node" },
                    { name: "REST API",                    desc: "Direct HTTP integration — no SDK needed" },
                  ].map(({ name, desc }) => (
                    <div key={name} className="border border-border bg-card p-4 hover:border-blue-500/40 transition-colors">
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

export default function PublicDocsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DocsContent />
    </Suspense>
  );
}
