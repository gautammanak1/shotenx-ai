"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Star, Shield, Zap, ArrowRight, TrendingUp } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";
import { api, type Agent, type LlmAgentSuggestion } from "@/lib/api";

type SourceFilter = "all" | "agentverse" | "a2a" | "openai";
type TrustTier = "new" | "trusted" | "verified";

type MarketAgent = {
  id: string; name: string; desc: string;
  source: Exclude<SourceFilter, "all">; category: string;
  rating: number; calls: number; verified: boolean; address: string;
  priceSats?: number; earningsSats?: number; usageCount?: number;
  trustScore?: number; trustTier?: TrustTier;
};

const BADGE: Record<string, string> = { AI: "badge-purple", Data: "badge-blue", Media: "badge-orange", Utility: "badge-green" };
const SOURCE_LABEL: Record<Exclude<SourceFilter, "all">, string> = { agentverse: "Agentverse", a2a: "A2A", openai: "OpenAI" };

const TRUST_META: Record<TrustTier, { label: string; className: string; icon: string }> = {
  verified: { label: "Verified",  className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", icon: "✓" },
  trusted:  { label: "Trusted",   className: "bg-violet-500/10 text-violet-500 border-violet-500/30",   icon: "⭐" },
  new:      { label: "New",       className: "bg-muted text-muted-foreground border-border",             icon: "◦" },
};

function normalizeSource(s: LlmAgentSuggestion["source"]): Exclude<SourceFilter, "all"> { return s === "fetch" ? "agentverse" : s; }

function mapBackendAgent(agent: Agent): MarketAgent {
  return {
    id: agent.id, name: agent.name,
    desc: agent.description || "Live agent from Agentverse backend.",
    source: "agentverse", category: agent.category || "AI",
    rating: agent.rating || 0, calls: agent.interactions || 0,
    verified: Boolean(agent.featured), address: agent.address || agent.id,
    priceSats: agent.priceSats, earningsSats: agent.earningsSats,
    usageCount: agent.usageCount, trustScore: agent.trustScore,
    trustTier: agent.trustTier,
  };
}

function mapSuggestedAgent(s: LlmAgentSuggestion): MarketAgent {
  return {
    id: `${normalizeSource(s.source)}-${s.id}`, name: s.name, desc: s.reason,
    source: normalizeSource(s.source), category: "AI", rating: 0, calls: 0,
    verified: s.source !== "a2a", address: s.address,
  };
}

function SkeletonCard() {
  return (
    <div className="border border-border bg-card p-5 flex flex-col gap-3 animate-pulse">
      <div className="flex items-start justify-between"><div className="h-9 w-9 bg-muted" /><div className="h-5 w-20 bg-muted" /></div>
      <div className="space-y-2"><div className="h-4 w-3/4 bg-muted" /><div className="h-3 w-full bg-muted" /><div className="h-3 w-5/6 bg-muted" /></div>
      <div className="h-7 w-full bg-muted" />
    </div>
  );
}

function TrustBadge({ tier }: { tier?: TrustTier }) {
  const t = tier ?? "new";
  const meta = TRUST_META[t];
  return (
    <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}>
      {meta.icon} {meta.label}
    </span>
  );
}

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [agents, setAgents] = useState<MarketAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true); setError("");
      const [br, sr] = await Promise.allSettled([
        api.searchAgents({ query: query || undefined, limit: 60 }),
        api.suggestAgentsByPrompt(query || "best marketplace agents"),
      ]);
      const merged = new Map<string, MarketAgent>();
      if (br.status === "fulfilled") br.value.agents.forEach((a) => { const m = mapBackendAgent(a); merged.set(`${m.source}:${m.address}`, m); });
      if (sr.status === "fulfilled") sr.value.forEach((s) => { const m = mapSuggestedAgent(s); const k = `${m.source}:${m.address}`; if (!merged.has(k)) merged.set(k, m); });
      if (merged.size === 0) setError("No data received from backend. Please check backend services.");
      setAgents(Array.from(merged.values())); setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => agents.filter((a) => source === "all" || a.source === source), [agents, source]);
  const sourceStats = useMemo(() => ({
    agentverse: agents.filter((a) => a.source === "agentverse").length,
    a2a: agents.filter((a) => a.source === "a2a").length,
    openai: agents.filter((a) => a.source === "openai").length,
  }), [agents]);

  const trustStats = useMemo(() => ({
    verified: agents.filter((a) => a.trustTier === "verified").length,
    trusted:  agents.filter((a) => a.trustTier === "trusted").length,
  }), [agents]);

  return (
    <PublicLayout title="Marketplace">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-500 mb-1">Marketplace</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Available Agents</h1>
            <p className="mt-1 text-sm text-muted-foreground">Live backend listings across Agentverse, A2A, and OpenAI.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/create-agent" className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">Create Agent</Link>
            <Link href="/leaderboard" className="border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">Leaderboard</Link>
            <Link href="/agent-chat" className="flex items-center gap-2 bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors">
              Start using agents <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Available agents", val: agents.length },
                { label: "Live sources", val: Object.values(sourceStats).filter((c) => c > 0).length },
                { label: "Total interactions", val: agents.reduce((s, a) => s + a.calls, 0).toLocaleString() },
              ].map(({ label, val }) => (
                <div key={label} className="border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{val}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 border border-border bg-card px-3 h-8 w-56">
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search agents..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </div>
              {(["all", "agentverse", "a2a", "openai"] as SourceFilter[]).map((item) => (
                <button key={item} onClick={() => setSource(item)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${source === item ? "bg-violet-600 text-white" : "border border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  {item === "all" ? "All" : SOURCE_LABEL[item]}
                  {item !== "all" && sourceStats[item] > 0 && <span className="ml-1 opacity-70">({sourceStats[item]})</span>}
                </button>
              ))}
              {source !== "all" && <button onClick={() => setSource("all")} className="text-xs text-violet-500 hover:underline">Clear filter ×</button>}
              <span className="ml-auto text-xs text-muted-foreground">{loading ? "Loading..." : `${filtered.length} of ${agents.length} agents`}</span>
            </div>

            {error && (
              <div className="border border-red-400/40 bg-red-500/5 p-4 text-sm text-red-500 flex items-center justify-between gap-4">
                <span>{error}</span>
                <button onClick={() => setQuery((q) => q)} className="shrink-0 border border-red-400/40 px-3 py-1 text-xs hover:bg-red-500/10 transition-colors">Retry</button>
              </div>
            )}

            {/* Grid */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              {!loading && filtered.length === 0 && (
                <div className="col-span-full border border-border bg-card p-10 text-center">
                  <Zap className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm font-medium text-foreground">No agents found</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Try a different search or{" "}
                    <button onClick={() => { setQuery(""); setSource("all"); }} className="text-violet-500 hover:underline">clear all filters</button>
                  </p>
                </div>
              )}
              {!loading && filtered.map((s) => (
                <div key={s.id} className="border border-border bg-card p-5 flex flex-col gap-3 hover:border-violet-500/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex h-9 w-9 items-center justify-center border border-border bg-muted text-sm font-bold text-muted-foreground">{s.name[0]}</div>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <span className={BADGE[s.category] ?? "badge-blue"}>{s.category}</span>
                      <span className="border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{SOURCE_LABEL[s.source]}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{s.name}</p>
                      {s.verified && <Shield className="h-3 w-3 text-green-500 shrink-0" />}
                      {/* Trust badge — PS: "earn trust, earn more" */}
                      <TrustBadge tier={s.trustTier} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground border border-border bg-muted/30 px-2 py-1 truncate">{s.address}</div>
                  <div className="flex items-center justify-between border-t border-border pt-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-foreground">{s.rating ? s.rating.toFixed(1) : "N/A"}</span>
                      <span className="text-[10px] text-muted-foreground ml-1">({s.calls.toLocaleString()})</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-violet-500">{s.priceSats ? `${s.priceSats} sats` : "live"}</span>
                  </div>
                  {/* Trust score + earnings row */}
                  {(s.earningsSats !== undefined || s.usageCount !== undefined || s.trustScore !== undefined) && (
                    <div className="flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground">
                      <span>Usage: {s.usageCount ?? 0}</span>
                      {s.trustScore !== undefined && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-2.5 w-2.5" /> Trust: {s.trustScore}
                        </span>
                      )}
                      <span>Earned: {s.earningsSats ?? 0} sats</span>
                    </div>
                  )}
                  <Link href={`/agent/${encodeURIComponent(s.address)}?name=${encodeURIComponent(s.name)}&description=${encodeURIComponent(s.desc)}&source=${encodeURIComponent(s.source)}`}
                    className="w-full bg-violet-600 py-1.5 text-center text-xs font-semibold text-white hover:bg-violet-500 transition-colors">
                    Use agent ⚡
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <aside className="space-y-3 lg:sticky lg:top-6">
            <div className="border border-border bg-card p-4">
              <p className="text-sm font-semibold">Marketplace Tips</p>
              <p className="mt-1 text-xs text-muted-foreground">Use search and source filters to quickly find production-ready agents for your workflow.</p>
            </div>
            <div className="border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-semibold">Source breakdown</p>
              {(["agentverse", "a2a", "openai"] as const).map((src) => (
                <div key={src} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{SOURCE_LABEL[src]}</span>
                  <span className="font-semibold text-foreground">{sourceStats[src]}</span>
                </div>
              ))}
            </div>
            {/* Trust breakdown — PS: "earn trust, earn more" */}
            <div className="border border-border bg-card p-4 space-y-2">
              <p className="text-sm font-semibold">Trust breakdown</p>
              <p className="text-[10px] text-muted-foreground mb-2">Agents earn trust through usage and Lightning payments</p>
              {(["verified", "trusted", "new"] as TrustTier[]).map((tier) => {
                const meta = TRUST_META[tier];
                const count = tier === "new"
                  ? agents.filter((a) => !a.trustTier || a.trustTier === "new").length
                  : trustStats[tier as "verified" | "trusted"];
                return (
                  <div key={tier} className="flex items-center justify-between text-xs">
                    <span className={`inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                      {meta.icon} {meta.label}
                    </span>
                    <span className="font-semibold text-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
