"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { api, type PaymentLog, type WalletInfo } from "@/lib/api";
import { fetchUserSupabaseTransactions, type DisplayPaymentLog } from "@/lib/user-ledger";

type Filter = "all" | "settled" | "consumed" | "pending" | "failed" | "expired";

const STATUS_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  settled: { label: "Settled", className: "text-[#ffffff]", icon: <CheckCircle2 className="h-3 w-3" /> },
  consumed: { label: "Consumed", className: "text-[#aaaaaa]", icon: <CheckCircle2 className="h-3 w-3" /> },
  pending: { label: "Pending", className: "text-[#888888]", icon: <Clock className="h-3 w-3" /> },
  expired: { label: "Expired", className: "text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
  failed: { label: "Failed", className: "text-[#444444]", icon: <XCircle className="h-3 w-3" /> },
};

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

const formatPath = (raw: string) => {
  if (!raw) return "/unknown";
  return raw.length > 56 ? `${raw.slice(0, 56)}…` : raw;
};

const isAgentToAgent = (log: DisplayPaymentLog) =>
  log.ledger === "backend" &&
  (log.event === "agent_autopay" ||
    log.event === "verified" ||
    log.requestPath.includes("auto-run"));

export default function TransactionsPage() {
  const [logs, setLogs] = useState<DisplayPaymentLog[]>([]);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [rows, info, sbRows] = await Promise.all([
        api.getPaymentLogs(200),
        api.getWalletInfo(),
        fetchUserSupabaseTransactions(),
      ]);
      const backendTagged: DisplayPaymentLog[] = rows.map((l) => ({ ...l, ledger: "backend" }));
      const merged = [...sbRows, ...backendTagged].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setLogs(merged);
      setWalletInfo({ alias: info.alias, balanceSats: info.balanceSats, mode: info.mode });
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load transactions");
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 8000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? logs : logs.filter((log) => log.status === filter)),
    [logs, filter]
  );

  const supabaseCount = useMemo(() => logs.filter((l) => l.ledger === "supabase").length, [logs]);

  const stats = useMemo(() => {
    const success = logs.filter((log) => log.status === "settled" || log.status === "consumed");
    const totalSats = success.reduce((sum, log) => sum + log.amountSats, 0);
    return {
      succeededCount: success.length,
      totalSats,
      pendingCount: logs.filter((log) => log.status === "pending").length,
      failedCount: logs.filter((log) => log.status === "failed").length,
      a2aCount: logs.filter(isAgentToAgent).length,
    };
  }, [logs]);

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const header = "id,timestamp,ledger,direction,amountSats,event,status,method,path";
    const lines = filtered.map((log) =>
      [
        log.id,
        log.timestamp,
        log.ledger,
        isAgentToAgent(log) ? "agent->agent" : "user->agent",
        log.amountSats,
        log.event,
        log.status,
        log.requestMethod,
        log.requestPath,
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([`${header}\n${lines.join("\n")}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shotenx-transactions-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#ffffff]">
            Transactions
          </h1>
          <p className="mt-1 text-xs text-[#888888]">
            Backend L402 log plus your Supabase ledger when configured · auto-refreshes every 8s
            {supabaseCount > 0 && (
              <span className="text-[#aaaaaa]"> · {supabaseCount} from Supabase</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void load(true)}
            className="flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 border border-border bg-card px-3 py-1.5 text-xs disabled:opacity-50"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Wallet + stats row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Wallet</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{walletInfo?.alias ?? "—"}</p>
          {walletInfo && (
            <p className="mt-1 text-[11px]">
              <span
                className={
                  walletInfo.mode === "alby-nwc"
                    ? "rounded border border-[#444444] bg-[#1a1a1a] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#ffffff]"
                    : walletInfo.mode === "unavailable"
                      ? "rounded border border-[#333333] bg-[#111111] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#666666]"
                      : "rounded border border-[#333333] bg-[#111111] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-[#888888]"
                }
              >
                {walletInfo.mode === "alby-nwc"
                  ? "Live (Alby NWC)"
                  : walletInfo.mode === "unavailable"
                    ? "Wallet offline"
                    : "Test Mode"}
              </span>
            </p>
          )}
        </div>
        <div className="border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Balance</p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {fmt(walletInfo?.balanceSats ?? 0)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">sats available</p>
        </div>
        <div className="border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Settled</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#ffffff]">
            {fmt(stats.totalSats)}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{stats.succeededCount} events</p>
        </div>
        <div className="border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">A2A calls</p>
          <p className="mt-1 font-mono text-2xl font-bold text-[#ffffff]">{stats.a2aCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">agent paid agent</p>
        </div>
        <div className="border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Health</p>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">
            {stats.pendingCount}
            <span className="text-sm text-muted-foreground"> / </span>
            <span className="text-[#666666]">{stats.failedCount}</span>
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">pending / failed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "settled", "consumed", "pending", "failed", "expired"] as Filter[]).map(
          (option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-wider transition-colors active:scale-[0.98] ${
                filter === option
                  ? "border-[#ffffff] bg-[#ffffff] text-[#000000]"
                  : "border-[#222222] text-[#888888] hover:border-[#444444] hover:bg-[#111111] hover:text-[#ffffff]"
              }`}
            >
              {option === "all" ? "All" : STATUS_META[option]?.label ?? option}
              <span className="opacity-70">
                {option === "all"
                  ? logs.length
                  : logs.filter((log) => log.status === option).length}
              </span>
            </button>
          ),
        )}
      </div>

      {error && (
        <div className="rounded-md border border-[#444444] bg-[#111111] p-3 font-mono text-sm text-[#aaaaaa]">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a] text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[#555555]">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3">Checkout</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading transactions…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No transactions yet. Run a paid flow on /demo, /agent-chat, or /marketplace. Apply the SQL
                  migration in <code className="text-[10px]">supabase/migrations/</code> to enable your Supabase
                  ledger.
                </td>
              </tr>
            )}
            {filtered.map((log, idx) => {
              const meta = STATUS_META[log.status] ?? STATUS_META.pending;
              const a2a = isAgentToAgent(log);
              return (
                <tr
                  key={log.id}
                  className={`hover:bg-[#111111] ${idx < filtered.length - 1 ? "border-b border-[#1a1a1a]" : ""}`}
                >
                  <td className="px-4 py-2 text-[11px] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-[11px]">
                    <span
                      className={
                        log.ledger === "supabase"
                          ? "rounded border border-[#ffffff] bg-[#1a1a1a] px-1.5 py-0.5 font-mono text-[10px] text-[#ffffff]"
                          : "rounded border border-[#333333] px-1.5 py-0.5 font-mono text-[10px] text-[#888888]"
                      }
                    >
                      {log.ledger === "supabase" ? "Supabase" : "Node"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[11px]">
                    <span
                      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                        a2a
                          ? "border-[#444444] text-[#cccccc]"
                          : "border-[#333333] text-[#888888]"
                      }`}
                    >
                      {a2a ? (
                        <ArrowUpFromLine className="h-3 w-3" />
                      ) : (
                        <ArrowDownToLine className="h-3 w-3" />
                      )}
                      {a2a ? "Agent → Agent" : "User → Agent"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-mono text-sm font-semibold text-[#ffffff]">
                    {log.amountSats} sats
                  </td>
                  <td className="px-4 py-2 text-xs">{log.event}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                    {log.requestMethod} {formatPath(log.requestPath)}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted-foreground">
                    {log.checkoutId ? `${log.checkoutId.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 text-xs ${meta.className}`}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          <p>
            {filtered.length} of {logs.length} events
          </p>
          <p>
            Sources: <span className="font-mono">public.transactions</span> +{" "}
            <span className="font-mono">/api/payments/logs/recent</span>
          </p>
        </div>
      </div>
    </div>
  );
}
