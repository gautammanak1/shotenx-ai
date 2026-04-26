"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Shield, Zap, ArrowRight, Pin } from "lucide-react";
import { PublicLayout } from "@/components/public-layout";
import { api, type Agent, type BuilderAgent, type LlmAgentSuggestion } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MiniTerminal, type TerminalLine } from "@/components/terminal";
import { NodeGraph, type GraphNode } from "@/components/node-graph";

type SourceFilter = "all" | "agentverse" | "a2a" | "openai";
type CategoryFilter = "All" | "Data" | "Code" | "Creative" | "Analytics";

type MarketAgent = {
  id: string;
  name: string;
  desc: string;
  source: Exclude<SourceFilter, "all">;
  category: string;
  rating: number;
  calls: number;
  verified: boolean;
  address: string;
  priceSats?: number;
  earningsSats?: number;
  usageCount?: number;
};

const SOURCE_LABEL: Record<Exclude<SourceFilter, "all">, string> = {
  agentverse: "Agentverse",
  a2a: "A2A",
  openai: "OpenAI",
};

const CATEGORY_FILTERS: CategoryFilter[] = ["All", "Data", "Code", "Creative", "Analytics"];

/** Builder agents shown first (pinned row). */
const PINNED_BUILDER_IDS: string[] = [
  "agent_0a510000-f001-4000-8000-000000005101",
  "agent_c2c2a000-f001-4000-8000-00000000d001",
  "agent_c2c2a000-f001-4000-8000-00000000d002",
];

function isPinnedAgent(address: string) {
  return PINNED_BUILDER_IDS.includes(address);
}

function sortPinnedAgentsFirst(list: MarketAgent[]) {
  const order = new Map(PINNED_BUILDER_IDS.map((id, i) => [id, i]));
  return [...list].sort((a, b) => {
    const ia = order.has(a.address) ? (order.get(a.address) as number) : 999;
    const ib = order.has(b.address) ? (order.get(b.address) as number) : 999;
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });
}

function mapBuilderRegistryAgent(b: BuilderAgent): MarketAgent {
  const cat: MarketAgent["category"] =
    b.type === "image" ? "Creative" : b.type === "code" ? "Code" : "Analytics";
  return {
    /** Stable unique id for React keys (avoids collision with search rows sharing the same address). */
    id: `registry:${b.id}`,
    name: b.name,
    desc: b.description,
    source: "openai",
    category: cat,
    rating: b.averageStars ?? 0,
    calls: b.usageCount ?? 0,
    verified: true,
    address: b.id,
    priceSats: b.price,
    earningsSats: b.earningsSats,
    usageCount: b.usageCount,
  };
}

function normalizeSource(s: LlmAgentSuggestion["source"]): Exclude<SourceFilter, "all"> {
  return s === "fetch" ? "agentverse" : s;
}

function mapBackendAgent(agent: Agent): MarketAgent {
  return {
    id: agent.id,
    name: agent.name,
    desc: agent.description || "Live agent from Agentverse backend.",
    source: "agentverse",
    category: agent.category || "AI",
    rating: agent.rating || 0,
    calls: agent.interactions || 0,
    verified: Boolean(agent.featured),
    address: agent.address || agent.id,
    priceSats: agent.priceSats,
    earningsSats: agent.earningsSats,
    usageCount: agent.usageCount,
  };
}

function mapSuggestedAgent(s: LlmAgentSuggestion): MarketAgent {
  return {
    id: `${normalizeSource(s.source)}-${s.id}`,
    name: s.name,
    desc: s.reason,
    source: normalizeSource(s.source),
    category: "AI",
    rating: 0,
    calls: 0,
    verified: s.source !== "a2a",
    address: s.address,
  };
}

function agentMatchesCategory(agent: MarketAgent, cat: CategoryFilter): boolean {
  if (cat === "All") return true;
  const blob = `${agent.category} ${agent.name} ${agent.desc}`.toLowerCase();
  if (cat === "Data") return /\bdata|sql|csv|etl|storage|dataset\b/.test(blob) || agent.category.toLowerCase() === "data";
  if (cat === "Code") return /\bcode|dev|api|rust|python|js|review|compile\b/.test(blob) || agent.category.toLowerCase().includes("code");
  if (cat === "Creative") return /\bcreative|media|image|video|copy|design\b/.test(blob) || agent.category.toLowerCase() === "media";
  if (cat === "Analytics") return /\banalytics|metric|forecast|model|ai\b/.test(blob) || agent.category.toLowerCase() === "ai";
  return false;
}

function sampleLinesForAgent(agent: MarketAgent): TerminalLine[] {
  const short = agent.name.slice(0, 18);
  return [
    { type: "command", text: `shotenx run --agent "${short}"`, delay: 200 },
    { type: "output", text: "Invoice: lnbc...", delay: 150 },
    { type: "success", text: `${agent.priceSats ?? 10} sats settled`, delay: 120 },
    { type: "output", text: "Response stream ready.", delay: 80 },
  ];
}

function SkeletonCard() {
  return (
    <Card className="animate-pulse">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between">
          <div className="h-9 w-9 bg-[#1a1a1a]" />
          <div className="h-5 w-20 bg-[#1a1a1a]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-[#1a1a1a]" />
          <div className="h-3 w-full bg-[#1a1a1a]" />
        </div>
        <div className="h-[120px] w-full bg-[#0a0a0a]" />
        <div className="h-8 w-full bg-[#1a1a1a]" />
      </CardContent>
    </Card>
  );
}

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [agents, setAgents] = useState<MarketAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      const [br, sr, reg] = await Promise.allSettled([
        api.searchAgents({ query: query || undefined, limit: 60 }),
        api.suggestAgentsByPrompt(query || "best marketplace agents"),
        api.listBuilderAgents(),
      ]);
      const merged = new Map<string, MarketAgent>();
      const builderIds =
        reg.status === "fulfilled" ? new Set(reg.value.map((b) => b.id)) : new Set<string>();

      if (reg.status === "fulfilled") {
        reg.value.forEach((b) => {
          const m = mapBuilderRegistryAgent(b);
          merged.set(`openai:${m.address}`, m);
        });
      }

      if (br.status === "fulfilled") {
        br.value.agents.forEach((a) => {
          const addr = (a.address || a.id).trim();
          if (builderIds.has(a.id) || builderIds.has(addr)) return;
          const m = mapBackendAgent(a);
          merged.set(`${m.source}:${m.address}`, m);
        });
      }
      if (sr.status === "fulfilled") {
        sr.value.forEach((s) => {
          if (builderIds.has(s.address) || builderIds.has(s.id)) return;
          const m = mapSuggestedAgent(s);
          const k = `${m.source}:${m.address}`;
          if (!merged.has(k)) merged.set(k, m);
        });
      }
      if (merged.size === 0) setError("No data received from backend. Please check backend services.");
      setAgents(sortPinnedAgentsFirst(Array.from(merged.values())));
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(
    () =>
      sortPinnedAgentsFirst(
        agents
          .filter((a) => source === "all" || a.source === source)
          .filter((a) => agentMatchesCategory(a, category))
      ),
    [agents, source, category]
  );

  const sourceStats = useMemo(
    () => ({
      agentverse: agents.filter((a) => a.source === "agentverse").length,
      a2a: agents.filter((a) => a.source === "a2a").length,
      openai: agents.filter((a) => a.source === "openai").length,
    }),
    [agents]
  );

  const graphNodes: GraphNode[] = useMemo(() => {
    return filtered.slice(0, 24).map((a, i) => ({
      id: a.id,
      label: a.name,
      x: ((i * 37) % 100) / 100,
      y: ((i * 53) % 100) / 100,
      weight: Math.max(1, a.earningsSats ?? 0, a.calls ?? 0, a.priceSats ?? 1),
    }));
  }, [filtered]);

  return (
    <PublicLayout title="">
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#ffffff]">
              Agent marketplace
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#888888]">
              Live listings across Agentverse, A2A, and OpenAI. Monochrome preview terminals show sample flows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/create-agent" className={cn(buttonVariants({ variant: "terminal" }))}>
              Create agent
            </Link>
            <Link href="/leaderboard" className={cn(buttonVariants({ variant: "terminal" }))}>
              Leaderboard
            </Link>
            <Link href="/agent-chat" className={cn(buttonVariants({ variant: "btc" }), "flex items-center gap-2")}>
              Start using agents <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Available agents", val: agents.length },
                { label: "Live sources", val: Object.values(sourceStats).filter((c) => c > 0).length },
                { label: "Total interactions", val: agents.reduce((s, a) => s + a.calls, 0).toLocaleString() },
              ].map(({ label, val }) => (
                <Card key={label}>
                  <CardContent className="p-4">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">{label}</p>
                    <p className="mt-1 font-mono text-2xl font-bold text-[#ffffff]">{val}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex h-10 min-w-[200px] flex-1 items-center gap-2 border border-[#222222] bg-[#0a0a0a] px-3 sm:max-w-md">
                <Search className="h-3.5 w-3.5 shrink-0 text-[#444444]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search agents..."
                  className="w-full bg-transparent font-mono text-sm text-[#ffffff] outline-none placeholder:text-[#444444]"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_FILTERS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors active:scale-[0.98] ${
                      category === c
                        ? "border-[#ffffff] bg-[#ffffff] text-[#000000]"
                        : "border-[#222222] bg-[#111111] text-[#888888] hover:border-[#444444] hover:text-[#ffffff]"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-[#1a1a1a] pb-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#555555]">Source</span>
              {(["all", "agentverse", "a2a", "openai"] as SourceFilter[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSource(item)}
                  className={`rounded border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors active:scale-[0.98] ${
                    source === item
                      ? "border-[#ffffff] bg-[#ffffff] text-[#000000]"
                      : "border-[#222222] text-[#888888] hover:border-[#444444] hover:bg-[#111111] hover:text-[#ffffff]"
                  }`}
                >
                  {item === "all" ? "All" : SOURCE_LABEL[item]}
                  {item !== "all" && sourceStats[item] > 0 && (
                    <span className="ml-1 opacity-70">({sourceStats[item]})</span>
                  )}
                </button>
              ))}
              {source !== "all" && (
                <button
                  type="button"
                  onClick={() => setSource("all")}
                  className="font-mono text-[10px] uppercase tracking-widest text-[#666666] hover:text-[#ffffff]"
                >
                  Clear ×
                </button>
              )}
              <span className="ml-auto font-mono text-[10px] text-[#555555]">
                {loading ? "Loading…" : `${filtered.length} of ${agents.length} agents`}
              </span>
            </div>

            {error && (
              <div className="border border-[#444444] bg-[#111111] p-4 font-mono text-sm text-[#aaaaaa]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{error}</span>
                  <button
                    type="button"
                    onClick={() => setQuery((q) => q)}
                    className="shrink-0 border border-[#333333] px-3 py-1 text-[10px] uppercase tracking-widest text-[#ffffff] hover:bg-[#1a1a1a]"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              {!loading && filtered.length === 0 && (
                <div className="col-span-full border border-[#1a1a1a] bg-[#111111] p-10 text-center">
                  <Zap className="mx-auto mb-3 h-8 w-8 text-[#444444]" />
                  <p className="font-mono text-sm text-[#ffffff]">No agents found</p>
                  <p className="mt-1 text-xs text-[#888888]">
                    Try another search or{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setSource("all");
                        setCategory("All");
                      }}
                      className="font-mono text-[#aaaaaa] underline hover:text-[#ffffff]"
                    >
                      reset filters
                    </button>
                  </p>
                </div>
              )}
              {!loading &&
                filtered.map((s) => (
                  <Card key={`${s.source}-${s.address}`} className="flex flex-col overflow-hidden">
                    <CardContent className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#333333] bg-[#0a0a0a] font-mono text-sm font-bold text-[#888888]">
                            {s.name[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate font-mono text-sm font-semibold text-[#ffffff]">{s.name}</p>
                              {isPinnedAgent(s.address) && (
                                <span
                                  className="inline-flex shrink-0 items-center gap-0.5 border border-[#333333] px-1 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#cccccc]"
                                  title="Pinned showcase agent"
                                >
                                  <Pin className="h-2.5 w-2.5" />
                                  Pinned
                                </span>
                              )}
                              {s.verified && <Shield className="h-3 w-3 shrink-0 text-[#aaaaaa]" />}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="border border-[#333333] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#888888]">
                                {s.category}
                              </span>
                              <span className="border border-[#222222] px-1.5 py-0.5 font-mono text-[10px] text-[#666666]">
                                {SOURCE_LABEL[s.source]}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-bold text-[#ffffff]">
                          {s.priceSats != null ? `${s.priceSats} sats` : "live"}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-[#888888]">{s.desc}</p>
                      <div className="truncate border border-[#1a1a1a] bg-[#0a0a0a] px-2 py-1 font-mono text-[10px] text-[#666666]">
                        {s.address}
                      </div>
                      <MiniTerminal lines={sampleLinesForAgent(s)} height={120} className="text-[11px]" />
                      <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-3 font-mono text-[10px] text-[#888888]">
                        <span>Rating {s.rating ? s.rating.toFixed(1) : "—"}</span>
                        <span>Calls {s.calls.toLocaleString()}</span>
                      </div>
                      {(s.earningsSats || s.usageCount) && (
                        <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-2 font-mono text-[10px] text-[#666666]">
                          <span>Usage {s.usageCount ?? 0}</span>
                          <span>Earned {s.earningsSats ?? 0} sats</span>
                        </div>
                      )}
                      <Link
                        href={`/agent-chat?agentAddress=${encodeURIComponent(s.address)}&name=${encodeURIComponent(s.name)}&description=${encodeURIComponent(s.desc)}&source=${encodeURIComponent(s.source)}`}
                        className={cn(buttonVariants({ variant: "btc" }), "w-full justify-center active:scale-[0.98]")}
                      >
                        Hire agent →
                      </Link>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <Card>
              <CardContent className="space-y-2 p-4">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#ffffff]">Network</p>
                <p className="text-xs text-[#888888]">Node size reflects usage and earnings in the current result set.</p>
                <NodeGraph nodes={graphNodes} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[#ffffff]">Source breakdown</p>
                <div className="mt-3 space-y-2">
                  {(["agentverse", "a2a", "openai"] as const).map((src) => (
                    <div key={src} className="flex items-center justify-between font-mono text-xs">
                      <span className="text-[#888888]">{SOURCE_LABEL[src]}</span>
                      <span className="text-[#ffffff]">{sourceStats[src]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </PublicLayout>
  );
}
