"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Cpu, FileText, Image, ArrowRight, CheckCircle2 } from "lucide-react";
import { api, type BuilderAgent } from "@/lib/api";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; desc: string }> = {
  content: { icon: FileText, color: "text-blue-500",   desc: "Generates text, summaries, posts" },
  image:   { icon: Image,    color: "text-purple-500", desc: "Creates or transforms images" },
  code:    { icon: Cpu,      color: "text-emerald-500",desc: "Writes, reviews, or runs code" },
};

const TIPS = [
  "Be specific — describe the exact task the agent should perform.",
  "Mention the output format: JSON, markdown, plain text, image URL.",
  "Include example inputs/outputs in your prompt for better results.",
  "Set a price that reflects the compute cost — 10–100 sats is typical.",
];

export default function CreateAgentPage() {
  const [prompt, setPrompt] = useState("");
  const [price, setPrice] = useState(10);
  const [status, setStatus] = useState("");
  const [created, setCreated] = useState<BuilderAgent | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setStatus("Creating agent...");
    try {
      const agent = await api.createBuilderAgent({ prompt, price, createdBy: "frontend-builder" });
      setCreated(agent);
      setStatus("Agent created and listed in marketplace.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not create agent");
    } finally {
      setLoading(false);
    }
  };

  const typeMeta = created ? TYPE_META[created.type] : null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Create Agent</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Describe your agent — backend generates, prices, and lists it instantly.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/marketplace" className="border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            Marketplace
          </Link>
          <Link href="/leaderboard" className="border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
            Leaderboard
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">

        {/* Main form */}
        <div className="space-y-4">

          {/* Prompt */}
          <div className="border border-border bg-card p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Agent description</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Describe what your agent does, its inputs, and expected outputs.</p>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              placeholder="Create a content writing agent that takes a topic and tone as input and returns a LinkedIn post in markdown format."
              className="w-full border border-border bg-background p-3 text-sm outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-foreground">Price per call</label>
                <div className="flex items-center border border-border bg-background">
                  <input
                    type="number"
                    min={1}
                    value={price}
                    onChange={(e) => setPrice(Math.max(1, Number(e.target.value)))}
                    className="h-8 w-20 bg-transparent px-2 text-sm outline-none"
                  />
                  <span className="border-l border-border px-2 text-xs text-muted-foreground">sats</span>
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={loading || !prompt.trim()}
                className="ml-auto flex items-center gap-2 bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                <Zap className="h-3.5 w-3.5 fill-white" />
                {loading ? "Creating..." : "Create Agent"}
              </button>
            </div>
            {status && (
              <p className={`text-xs ${created ? "text-emerald-500" : "text-muted-foreground"}`}>{status}</p>
            )}
          </div>

          {/* Created result card */}
          {created && typeMeta && (
            <div className="border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">Agent created successfully</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Name",     val: created.name },
                  { label: "Price",    val: `${created.price} sats` },
                  { label: "Type",     val: created.type },
                  { label: "Usage",    val: `${created.usageCount} calls` },
                ].map(({ label, val }) => (
                  <div key={label} className="border border-border bg-card p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-foreground capitalize">{val}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center bg-card border border-border`}>
                  <typeMeta.icon className={`h-3.5 w-3.5 ${typeMeta.color}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground capitalize">{created.type} agent</p>
                  <p className="text-[10px] text-muted-foreground">{typeMeta.desc}</p>
                </div>
              </div>

              <div className="border border-border bg-background px-3 py-2">
                <p className="text-[10px] text-muted-foreground mb-0.5">Endpoint</p>
                <p className="font-mono text-xs text-foreground truncate">{created.endpoint}</p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/agent/${encodeURIComponent(created.id)}?name=${encodeURIComponent(created.name)}&description=${encodeURIComponent(created.description)}`}
                  className="flex items-center gap-1.5 bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                >
                  Open Agent <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/marketplace"
                  className="border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  View in Marketplace
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">

          {/* Agent types */}
          <div className="border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Agent types</p>
            <p className="text-xs text-muted-foreground">The backend infers the type from your prompt.</p>
            {Object.entries(TYPE_META).map(([type, meta]) => (
              <div key={type} className="flex items-start gap-3 border border-border bg-background p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center bg-muted">
                  <meta.icon className={`h-3.5 w-3.5 ${meta.color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground capitalize">{type}</p>
                  <p className="text-[10px] text-muted-foreground">{meta.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="border border-border bg-card p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Prompt tips</p>
            <ul className="space-y-2">
              {TIPS.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-0.5 shrink-0 font-mono text-blue-500">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing guide */}
          <div className="border border-border bg-card p-4 space-y-2">
            <p className="text-sm font-semibold text-foreground">Pricing guide</p>
            {[
              { range: "1–10 sats",   use: "Simple lookups, short text" },
              { range: "10–50 sats",  use: "Content generation, summaries" },
              { range: "50–200 sats", use: "Code generation, image tasks" },
            ].map(({ range, use }) => (
              <div key={range} className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold text-blue-500">{range}</span>
                <span className="text-muted-foreground">{use}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
