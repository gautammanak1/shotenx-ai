"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Zap, TrendingUp, Activity, Users, ArrowRight, RefreshCw, CheckCircle2, Clock, XCircle, Circle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { api, type Agent, type BuilderAgent, type PaymentLog } from "@/lib/api";
import { useToast } from "@/components/theme-provider";

/* ── tiny helpers ── */
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  settled:  { label: "Settled",  color: "text-[#ffffff]", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending:  { label: "Pending",  color: "text-[#888888]",  icon: <Clock className="h-3 w-3" /> },
  consumed: { label: "Consumed", color: "text-[#aaaaaa]",    icon: <CheckCircle2 className="h-3 w-3" /> },
  expired:  { label: "Expired",  color: "text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
  failed:   { label: "Failed",   color: "text-[#444444]",     icon: <XCircle className="h-3 w-3" /> },
};

/* ── inline bar chart ── */
function BarChart({ data }: { data: { label: string; value: number; sub: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="group">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
              <span className="text-muted-foreground mr-1.5">#{i + 1}</span>{d.label}
            </span>
            <span className="text-xs font-bold text-[#ffffff] font-mono">{fmt(d.value)} sats</span>
          </div>
          <div className="relative h-2 w-full bg-muted overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#ffffff] transition-all duration-700 ease-out group-hover:bg-[#cccccc]"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{d.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ── sparkline (last N payment amounts) ── */
function Sparkline({ values }: { values: number[] }) {
  const W = 80; const H = 24;
  if (values.length < 2) return <span className="text-[10px] text-muted-foreground">—</span>;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - (v / max) * H,
  }));
  const pts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg width={W} height={H} className="overflow-visible">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#ffffff]" />
      <circle cx={last.x} cy={last.y} r="2" className="fill-[#ffffff]" />
    </svg>
  );
}

/* ── L402 flow diagram ── */
const FLOW = [
  { icon: "🤖", label: "Agent",    desc: "Sends request" },
  { icon: "⚡", label: "HTTP 402", desc: "Invoice returned" },
  { icon: "💸", label: "Pay",      desc: "Lightning payment" },
  { icon: "🔓", label: "Token",    desc: "Access granted" },
  { icon: "📄", label: "Result",   desc: "Data delivered" },
];

function FlowDiagram({ active }: { active: number }) {
  return (
    <div className="flex items-center gap-0">
      {FLOW.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className={`flex flex-col items-center gap-1 px-3 py-2 transition-all duration-300 ${i <= active ? "opacity-100" : "opacity-25"}`}>
            <div className={`flex h-9 w-9 items-center justify-center text-lg border transition-colors ${i <= active ? "border-[#ffffff] bg-[#1a1a1a]" : "border-border bg-muted"}`}>
              {step.icon}
            </div>
            <p className="text-[10px] font-semibold text-foreground">{step.label}</p>
            <p className="text-[9px] text-muted-foreground">{step.desc}</p>
          </div>
          {i < FLOW.length - 1 && (
            <ArrowRight className={`h-3 w-3 shrink-0 transition-colors ${i < active ? "text-[#ffffff]" : "text-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── stat card ── */
function StatCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string | number; sub: string; icon: React.ElementType; trend?: "up" | "neutral" }) {
  return (
    <div className="border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center border border-[#333333] bg-[#111111]">
          <Icon className="h-3.5 w-3.5 text-[#ffffff]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
      <div className="flex items-center gap-1.5">
        {trend === "up" && <TrendingUp className="h-3 w-3 text-[#888888]" />}
        <p className="text-[11px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [leaderboard, setLeaderboard] = useState<BuilderAgent[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [autoPrompt, setAutoPrompt] = useState("");
  const [status, setStatus] = useState("Live data — refreshes every 8s.");
  const [autoResult, setAutoResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [flowStep, setFlowStep] = useState(-1);
  const flowRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    const [agentsRes, boardRes, logsRes] = await Promise.allSettled([
      api.searchAgents({ query: query || undefined, limit: 30 }),
      api.getBuilderLeaderboard(10),
      api.getPaymentLogs(20),
    ]);
    if (agentsRes.status === "fulfilled") setAgents(agentsRes.value.agents); else setAgents([]);
    if (boardRes.status === "fulfilled") setLeaderboard(boardRes.value); else setLeaderboard([]);
    if (logsRes.status === "fulfilled") setPaymentLogs(logsRes.value); else setPaymentLogs([]);
    if (showRefresh) setRefreshing(false);
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  /* animate flow diagram — pause when tab hidden */
  useEffect(() => {
    let step = -1;
    const tick = () => { step = (step + 1) >= FLOW.length ? -1 : step + 1; setFlowStep(step); };
    const start = () => { flowRef.current = setInterval(tick, 900); };
    const stop  = () => { if (flowRef.current) { clearInterval(flowRef.current); flowRef.current = null; } };
    const onVisibility = () => document.hidden ? stop() : start();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  const totalEarnings = useMemo(() => leaderboard.reduce((s, a) => s + a.earningsSats, 0), [leaderboard]);
  const totalUsage    = useMemo(() => leaderboard.reduce((s, a) => s + a.usageCount, 0), [leaderboard]);

  const settledCount  = useMemo(() => paymentLogs.filter((l) => l.status === "settled" || l.status === "consumed").length, [paymentLogs]);
  const sparkValues   = useMemo(() => paymentLogs.slice(0, 12).reverse().map((l) => l.amountSats), [paymentLogs]);

  const barData = useMemo(() =>
    leaderboard.slice(0, 6).map((a) => ({ label: a.name, value: a.earningsSats, sub: `${a.usageCount} calls · ${a.price} sats/call` })),
    [leaderboard]
  );

  const paymentTimeline = useMemo(() => {
    const buckets = new Map<string, { label: string; sats: number; count: number }>();
    for (const log of paymentLogs) {
      const d = new Date(log.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:00`;
      const label = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00`;
      const cur = buckets.get(key) ?? { label, sats: 0, count: 0 };
      cur.sats += log.amountSats;
      cur.count += 1;
      buckets.set(key, cur);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({ label: v.label, sats: v.sats, events: v.count }))
      .slice(-48);
  }, [paymentLogs]);

  const handleAutoRun = async () => {
    if (!autoPrompt.trim() || loading) return;
    setLoading(true);
    setStatus("Selecting best agent and paying automatically...");
    try {
      const result = await api.autoRunSmartAgent(autoPrompt, `dashboard-${Date.now()}`);
      const output = result.result.text ?? result.result.summary ?? result.result.imageUrl ?? JSON.stringify(result.result);
      setAutoResult(output);
      setStatus(`Done: ${result.selectedAgent.name} executed for ${result.payment.amountSats} sats.`);
      toast(`Paid ${result.payment.amountSats} sats ⚡ — ${result.selectedAgent.name}`, "success");
      setAutoPrompt("");
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auto run failed";
      setStatus(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Overview</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Live data from backend · auto-refreshes every 8s</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void load(true)} className="flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <Link href="/agent-chat" className="flex items-center gap-1.5 border border-[#ffffff] bg-[#ffffff] px-3 py-1.5 text-xs font-semibold text-[#000000] hover:bg-[#dddddd] transition-colors">
            <Zap className="h-3 w-3 fill-white" /> Run Agent
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger">
        <StatCard label="Total agents"     value={agents.length}          sub="across all sources"          icon={Users}    trend="up" />
        <StatCard label="Top-10 earnings"  value={`${fmt(totalEarnings)} sats`} sub="combined leaderboard"  icon={Zap}      trend="up" />
        <StatCard label="Total calls"      value={fmt(totalUsage)}        sub="top-10 agents"               icon={Activity} trend="up" />
        <StatCard label="Payment events"   value={paymentLogs.length}     sub={`${settledCount} settled`}   icon={TrendingUp} />
      </div>

      {/* ── L402 flow + sparkline row ── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">L402 Payment Flow</p>
              <p className="text-xs text-muted-foreground mt-0.5">Live animation of every agent request cycle</p>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#888888]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffffff] animate-pulse" /> Live
            </span>
          </div>
          <div className="overflow-x-auto">
            <FlowDiagram active={flowStep} />
          </div>
        </div>

        <div className="border border-border bg-card p-5 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Payment Activity</p>
            <p className="text-xs text-muted-foreground mt-0.5">Last {sparkValues.length} events (sats)</p>
          </div>
          <div className="mt-4 flex items-end justify-center">
            <Sparkline values={sparkValues} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["settled", "pending", "failed", "expired"] as const).map((s) => {
              const meta = STATUS_META[s];
              const count = paymentLogs.filter((l) => l.status === s).length;
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={meta.color}>{meta.icon}</span>
                  <span className="text-[11px] text-muted-foreground">{meta.label}</span>
                  <span className="ml-auto text-[11px] font-semibold text-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Payment volume over time ── */}
      {paymentTimeline.length > 0 && (
        <div className="border border-border bg-card p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">Lightning volume (by hour)</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sats from payment log events — live backend feed</p>
          </div>
          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={paymentTimeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#555555", fontFamily: "var(--font-geist-mono), monospace" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#555555", fontFamily: "var(--font-geist-mono), monospace" }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    backgroundColor: "#111111",
                    border: "1px solid #333333",
                    color: "#ffffff",
                  }}
                  formatter={(value) => [`${typeof value === "number" ? value : Number(value) || 0} sats`, "Volume"]}
                />
                <Line type="monotone" dataKey="sats" stroke="#ffffff" strokeWidth={1.5} dot={false} name="sats" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Bar chart + payment feed ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Earnings bar chart */}
        <div className="border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Top Agent Earnings</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sats earned by top 6 agents</p>
            </div>
            <Link href="/leaderboard" className="text-xs text-[#aaaaaa] hover:text-[#ffffff] hover:underline flex items-center gap-1">
              Full leaderboard <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {barData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Circle className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No leaderboard data yet</p>
            </div>
          ) : (
            <BarChart data={barData} />
          )}
        </div>

        {/* Payment feed */}
        <div className="border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Recent Payments</p>
              <p className="text-xs text-muted-foreground mt-0.5">Live payment event stream</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-[#ffffff] animate-pulse" /> streaming
            </span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-auto">
            {paymentLogs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Activity className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">No payment events yet</p>
              </div>
            )}
            {paymentLogs.map((log) => {
              const meta = STATUS_META[log.status] ?? STATUS_META.pending;
              return (
                <div key={log.id} className="flex items-center gap-3 border border-border bg-background px-3 py-2">
                  <span className={`shrink-0 ${meta.color}`}>{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{log.event}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{log.requestMethod} {log.requestPath}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-[#ffffff] font-mono">{log.amountSats}s</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Smart auto-run ── */}
      <div className="border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Smart Auto Agent Run</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Backend picks best agent, auto-pays via L402, returns result.</p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter agent list..."
            className="h-8 w-52 shrink-0 border border-border bg-background px-3 text-xs outline-none"
          />
        </div>
        <textarea
          value={autoPrompt}
          onChange={(e) => setAutoPrompt(e.target.value)}
          rows={3}
          className="mt-4 w-full border border-border bg-background p-3 text-sm outline-none focus:border-[#ffffff] transition-colors"
          placeholder="Ask anything — e.g. summarize the latest AI news..."
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{status}</p>
          <button
            onClick={handleAutoRun}
            disabled={loading || !autoPrompt.trim()}
            className="flex items-center gap-2 border border-[#ffffff] bg-[#ffffff] px-4 py-2 text-sm font-semibold text-[#000000] hover:bg-[#dddddd] transition-colors disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 fill-white" />
            {loading ? "Running..." : "Run + Auto Pay"}
          </button>
        </div>
        {autoResult && (
          <pre className="mt-3 max-h-48 overflow-auto border border-border bg-background p-3 text-xs text-foreground">
            {autoResult}
          </pre>
        )}
      </div>

    </div>
  );
}
