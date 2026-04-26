"use client";

import { useState } from "react";
import { CheckCircle2, Shield, Star } from "lucide-react";
import Link from "next/link";

const STEPS = [
  { icon: "🔧", title: "Wrap your API", desc: "Add L402 middleware via MoneyDevKit in minutes." },
  { icon: "💰", title: "Set your price", desc: "Choose a per-request price in sats. You keep it all." },
  { icon: "⚡", title: "Get paid instantly", desc: "Every call triggers a Lightning payment to your wallet." }
];

type Form = { name: string; desc: string; endpoint: string; price: string; wallet: string; category: string };

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<Form>({ name: "", desc: "", endpoint: "", price: "", wallet: "", category: "AI" });

  const set = (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-green-200 bg-green-50 dark:border-green-500/20 dark:bg-green-500/10">
          <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">You&apos;re live on ShotenX AI</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your API is now discoverable in the catalog. Agents will start paying you per call via Lightning.
        </p>
        <div className="flex gap-2 mt-1">
          <button onClick={() => setSubmitted(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
            Register another
          </button>
          <Link href="/marketplace" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
            View Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Register Your API</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Start earning sats per request in minutes.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Form */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="text-sm font-semibold text-foreground">Service details</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Service Name <span className="text-red-500">*</span></label>
              <input value={form.name} onChange={set("name")} placeholder="e.g. Document Summarizer"
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-muted-foreground transition-colors" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description</label>
              <textarea value={form.desc} onChange={set("desc")} placeholder="What does your API do?" rows={3}
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-muted-foreground resize-none transition-colors" />
              <p className="text-[11px] text-muted-foreground">Give your service a short and clear description. 120–160 characters recommended.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Endpoint URL</label>
              <input value={form.endpoint} onChange={set("endpoint")} placeholder="https://your-api.com/endpoint"
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-muted-foreground transition-colors" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Price per request (sats)</label>
                <input value={form.price} onChange={set("price")} placeholder="50" type="number"
                  className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-muted-foreground transition-colors" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Category</label>
                <select value={form.category} onChange={set("category")}
                  className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors">
                  {["AI", "Data", "Media", "Utility"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Lightning Wallet</label>
              <input value={form.wallet} onChange={set("wallet")} placeholder="you@getalby.com"
                className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-blue-500 placeholder:text-muted-foreground transition-colors" />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button onClick={() => setForm({ name: "", desc: "", endpoint: "", price: "", wallet: "", category: "AI" })}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={() => setSubmitted(true)}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors">
                Register &amp; Start Earning ⚡
              </button>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="text-sm font-semibold text-foreground">How it works</h2>
            </div>
            <div className="p-5 space-y-4">
              {STEPS.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-sm">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
              <Shield className="h-4 w-4" /> Trust &amp; Verification
            </div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/70">
              All providers go through verification. Reputation scores are tracked on every call.
              Verified badge shown to agents in the catalog.
            </p>
            <div className="flex items-center gap-1 text-xs text-blue-600/70 dark:text-blue-400/60">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              Ratings visible to all agents
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
