"use client";

import { useState } from "react";
import { CheckCircle2, Shield, Star } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

const STEPS = [
  { icon: "🔧", title: "Wrap your API", desc: "Add L402 middleware via MoneyDevKit in minutes." },
  { icon: "💰", title: "Set your price", desc: "Choose a per-request price in sats. You keep it all." },
  { icon: "⚡", title: "Get paid instantly", desc: "Every call triggers a Lightning payment to your wallet." }
];

type Form = { name: string; desc: string; endpoint: string; price: string; wallet: string; category: string };

const randomKey = () => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `sk_live_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
};

const serviceId = () => `svc_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<Form>({ name: "", desc: "", endpoint: "", price: "", wallet: "", category: "AI" });
  const [liveUrl, setLiveUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [persistNote, setPersistNote] = useState("");

  const set = (k: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#444444] bg-[#111111]">
          <CheckCircle2 className="h-7 w-7 text-[#ffffff]" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">You&apos;re live on ShotenX AI</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your API is now discoverable in the catalog. Agents will start paying you per call via Lightning.
        </p>
        {liveUrl && (
          <div className="mt-4 w-full max-w-lg rounded-md border border-border bg-muted/30 p-4 text-left text-xs">
            <p className="font-semibold text-foreground">L402-protected tools (backend)</p>
            <p className="mt-2 break-all text-muted-foreground">
              <span className="text-foreground">Summarize (10 sats):</span>{" "}
              <code className="text-[11px]">POST /backend/api/tools/summarize</code>
            </p>
            <p className="mt-1 break-all text-muted-foreground">
              <span className="text-foreground">Your service id:</span>{" "}
              <code className="text-[11px] text-[#aaaaaa]">{liveUrl}</code>
            </p>
            <p className="mt-2 break-all text-muted-foreground">
              <span className="text-foreground">API key (store securely):</span>{" "}
              <code className="text-[11px]">{apiKey}</code>
            </p>
            {persistNote && <p className="mt-2 text-[11px] text-[#888888]">{persistNote}</p>}
          </div>
        )}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => {
              setSubmitted(false);
              setLiveUrl("");
              setApiKey("");
              setPersistNote("");
            }}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
          >
            Register another
          </button>
          <Link
            href="/marketplace"
            className="rounded-md border border-[#ffffff] bg-[#ffffff] px-4 py-2 text-sm font-semibold text-[#000000] hover:bg-[#dddddd] transition-colors active:scale-[0.98]"
          >
            View Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#ffffff]">
          Register your API
        </h1>
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
              <label className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#aaaaaa]">
                Service name <span className="text-[#666666]">*</span>
              </label>
              <input value={form.name} onChange={set("name")} placeholder="e.g. Document Summarizer"
                className="w-full rounded-md border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#ffffff] outline-none transition-colors placeholder:text-[#444444] focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Description</label>
              <textarea value={form.desc} onChange={set("desc")} placeholder="What does your API do?" rows={3}
                className="w-full resize-none rounded-md border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#ffffff] outline-none transition-colors placeholder:text-[#444444] focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]" />
              <p className="text-[11px] text-muted-foreground">Give your service a short and clear description. 120–160 characters recommended.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Endpoint URL</label>
              <input value={form.endpoint} onChange={set("endpoint")} placeholder="https://your-api.com/endpoint"
                className="w-full rounded-md border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#ffffff] outline-none transition-colors placeholder:text-[#444444] focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Price per request (sats)</label>
                <input value={form.price} onChange={set("price")} placeholder="50" type="number"
                  className="w-full rounded-md border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#ffffff] outline-none transition-colors placeholder:text-[#444444] focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Category</label>
                <select value={form.category} onChange={set("category")}
                  className="w-full rounded-md border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#ffffff] outline-none transition-colors focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]">
                  {["AI", "Data", "Media", "Utility"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Lightning Wallet</label>
              <input value={form.wallet} onChange={set("wallet")} placeholder="you@getalby.com"
                className="w-full rounded-md border border-[#222222] bg-[#0a0a0a] px-3 py-2 font-mono text-sm text-[#ffffff] outline-none transition-colors placeholder:text-[#444444] focus:border-[#ffffff] focus:ring-1 focus:ring-[#ffffff]" />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button onClick={() => setForm({ name: "", desc: "", endpoint: "", price: "", wallet: "", category: "AI" })}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const sid = serviceId();
                  const key = randomKey();
                  setLiveUrl(sid);
                  setApiKey(key);
                  setPersistNote("");
                  const row = {
                    id: sid,
                    name: form.name.trim() || "Untitled service",
                    description: form.desc.trim(),
                    price_sats: Math.max(1, parseInt(form.price, 10) || 10),
                    endpoint_url: form.endpoint.trim() || "https://example.com/api",
                    category: form.category,
                    api_key: key,
                    lightning_address: form.wallet.trim() || null,
                  };
                  try {
                    window.localStorage.setItem(
                      `shotenx_service_${sid}`,
                      JSON.stringify({ ...row, createdAt: new Date().toISOString() })
                    );
                  } catch {
                    /* ignore */
                  }
                  const supabase = createClient();
                  if (supabase) {
                    const { data: auth } = await supabase.auth.getUser();
                    if (!auth.user) {
                      setPersistNote(
                        "Sign in to persist services to Supabase. Listing saved in this browser only."
                      );
                    } else {
                      const { error } = await supabase.from("services").insert({
                        ...row,
                        user_id: auth.user.id,
                      });
                      if (error) {
                        setPersistNote(
                          `Supabase: ${error.message} — Run SQL in supabase/migrations/20260426120000_services_and_transactions.sql (Dashboard → SQL Editor), then retry.`
                        );
                      } else {
                        setPersistNote("Saved to Supabase table public.services.");
                      }
                    }
                  } else {
                    setPersistNote("Supabase env not set — saved locally only.");
                  }
                  setSubmitted(true);
                }}
                className="rounded-md border border-[#ffffff] bg-[#ffffff] px-5 py-2 text-sm font-semibold text-[#000000] hover:bg-[#dddddd] transition-colors active:scale-[0.98]"
              >
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

          <div className="space-y-2 rounded-lg border border-[#1a1a1a] bg-[#111111] p-4">
            <div className="flex items-center gap-2 font-mono text-sm font-semibold uppercase tracking-widest text-[#ffffff]">
              <Shield className="h-4 w-4 text-[#888888]" /> Trust &amp; verification
            </div>
            <p className="text-xs text-[#888888]">
              All providers go through verification. Reputation scores are tracked on every call.
              Verified badge shown to agents in the catalog.
            </p>
            <div className="flex items-center gap-1 font-mono text-xs text-[#666666]">
              <Star className="h-3 w-3 fill-[#444444] text-[#888888]" />
              Ratings visible to all agents
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
