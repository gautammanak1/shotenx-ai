"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, Circle, Copy, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { ensureBitcoinConnectInit } from "@/lib/bitcoin-connect-init";
import { insertUserTransaction } from "@/lib/user-ledger";
import { Terminal, btcAgentSequence } from "@/components/terminal";
import { BtcAgentViz, type AgentVizState } from "@/components/btc-agent-viz";
import { motion } from "framer-motion";

type Phase = "idle" | "invoice" | "done" | "error";
type ToolPath = "/summarize" | "/code-review";

type L402Body = {
  checkoutId?: string;
  paymentRequest?: string;
  amountSats?: number;
};

const TOOL_META: Record<ToolPath, { label: string; sats: number; serviceName: string }> = {
  "/summarize": { label: "Summarize (10 sats)", sats: 10, serviceName: "Summarize (L402)" },
  "/code-review": { label: "Code review (50 sats)", sats: 50, serviceName: "Code review (L402)" },
};

export default function DemoPage() {
  const [tool, setTool] = useState<ToolPath>("/summarize");
  const [prompt, setPrompt] = useState(
    "Summarize in one sentence: Lightning enables instant settlement for machine-to-machine payments."
  );
  const [buyerId] = useState(() => `judge-demo-${Date.now()}`);
  const [phase, setPhase] = useState<Phase>("idle");
  const [logLines, setLogLines] = useState<string[]>([]);
  const [invoice, setInvoice] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [amountSats, setAmountSats] = useState(10);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const vizState: AgentVizState = useMemo(() => {
    if (phase === "done") return "settled";
    if (phase === "invoice" && loading) return "paying";
    if (phase === "invoice") return "invoicing";
    if (loading && phase === "idle") return "requesting";
    return "idle";
  }, [phase, loading]);

  const pushLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
  }, []);

  const runLiveL402 = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult("");
    setInvoice("");
    setCheckoutId("");
    setPhase("idle");
    setLogLines([]);
    const meta = TOOL_META[tool];
    setAmountSats(meta.sats);
    try {
      pushLog(`POST /backend/api/tools${tool} (${meta.sats} sats) — no payment yet`);
      const first = await api.postToolL402(tool, { prompt: prompt.trim(), buyerId });
      if (first.status !== 402) {
        const err = String(
          (first.payload as { error?: string; message?: string }).error ??
            (first.payload as { message?: string }).message ??
            `Unexpected status ${first.status}`
        );
        throw new Error(first.ok ? "Expected 402 paywall on first call." : err);
      }
      const l402 = (first.payload as { l402?: L402Body }).l402 ?? (first.payload as L402Body);
      const cid = String(l402.checkoutId ?? "");
      const inv = String(l402.paymentRequest ?? "");
      const amt = Number(l402.amountSats ?? meta.sats);
      if (!cid || !inv) throw new Error("402 response missing checkout or invoice.");
      setCheckoutId(cid);
      setInvoice(inv);
      setAmountSats(amt);
      setPhase("invoice");
      pushLog(`HTTP 402 — invoice issued (${amt} sats).`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Demo failed";
      setError(msg);
      setPhase("error");
      pushLog(`ERROR: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const payWithWalletAndFinish = async () => {
    if (!invoice || !checkoutId || loading) return;
    setLoading(true);
    setError("");
    const meta = TOOL_META[tool];
    try {
      pushLog("Opening wallet (Bitcoin Connect)…");
      const mod = await ensureBitcoinConnectInit();
      const provider = await mod.requestProvider();
      const payment = (await provider.sendPayment(invoice)) as Record<string, unknown>;
      const preimage = [payment.preimage, payment.payment_preimage, payment.paymentPreimage].find(
        (v) => typeof v === "string" && (v as string).trim()
      );
      if (!preimage || typeof preimage !== "string") {
        throw new Error("Wallet did not return a preimage.");
      }
      pushLog("Retrying with Authorization: L402 …");
      const second = await api.postToolL402(tool, {
        prompt: prompt.trim(),
        buyerId,
        authorization: `L402 ${checkoutId}:${preimage}`,
      });
      if (!second.ok) {
        const err = String(
          (second.payload as { error?: string; message?: string }).error ??
            (second.payload as { message?: string }).message ??
            `HTTP ${second.status}`
        );
        throw new Error(err);
      }
      const payload = second.payload as { result?: { summary?: string; review?: string } };
      const summary =
        tool === "/summarize"
          ? String(payload.result?.summary ?? "")
          : String(payload.result?.review ?? JSON.stringify(payload.result ?? {}));
      setResult(summary);
      setPhase("done");
      pushLog("HTTP 200 — paid tool response unlocked.");
      const ledger = await insertUserTransaction({
        amountSats: amountSats,
        serviceName: meta.serviceName,
        status: "consumed",
        checkoutId,
        requestPath: `/backend/api/tools${tool}`,
        event: "demo_unlock",
      });
      if (ledger.ok) pushLog("Recorded in Supabase public.transactions.");
      else if (ledger.error !== "supabase_not_configured" && ledger.error !== "not_signed_in") {
        pushLog(`Supabase: ${ledger.error}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Payment or unlock failed";
      setError(msg);
      setPhase("error");
      pushLog(`ERROR: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const copyInvoice = async () => {
    if (!invoice) return;
    await navigator.clipboard.writeText(invoice);
    pushLog("Invoice copied.");
  };

  const steps = [
    { label: "Request sent", done: logLines.length > 0 },
    { label: "Invoice (402)", done: phase === "invoice" || phase === "done" },
    { label: "Payment sent", done: phase === "done" },
    { label: "Result", done: phase === "done" && Boolean(result) },
  ];

  return (
    <div className="space-y-6 font-mono text-[13px] text-[#aaaaaa]">
      <div>
        <h1 className="font-mono text-[11px] font-semibold uppercase tracking-[0.35em] text-[#ffffff]">
          Demo
        </h1>
        <p className="mt-1 text-[13px] text-[#555555]">Live L402 against your Node backend · grayscale UI only</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Terminal lines={btcAgentSequence} autoPlay loop height={360} />

        <div className="space-y-4 border border-[#1a1a1a] bg-[#111111] p-4">
          <p className="text-[10px] uppercase tracking-widest text-[#555555]">Control</p>
          <label className="block text-[10px] uppercase tracking-widest text-[#555555]">Service</label>
          <select
            value={tool}
            onChange={(e) => setTool(e.target.value as ToolPath)}
            className="w-full border border-[#222222] bg-[#0a0a0a] px-3 py-2 text-[13px] text-[#ffffff] outline-none focus:border-[#ffffff]"
          >
            <option value="/summarize">Summarize (10 sats)</option>
            <option value="/code-review">Code review (50 sats)</option>
          </select>

          <label className="block text-[10px] uppercase tracking-widest text-[#555555]">Input</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full border border-[#222222] bg-[#0a0a0a] p-3 text-[13px] text-[#ffffff] outline-none focus:border-[#ffffff]"
          />

          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-center gap-2 text-[12px]">
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 text-[#ffffff]" />
                ) : (
                  <Circle className="h-4 w-4 text-[#444444]" />
                )}
                <span className={s.done ? "text-[#ffffff]" : "text-[#555555]"}>
                  {i + 1}. {s.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void runLiveL402()}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 border border-[#ffffff] bg-[#ffffff] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#000000] hover:bg-[#dddddd] disabled:opacity-40 active:scale-[0.98]"
            >
              {loading && phase !== "invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Run agent
            </button>
            {phase === "invoice" && (
              <button
                type="button"
                onClick={() => void payWithWalletAndFinish()}
                disabled={loading}
                className="flex items-center gap-2 border border-[#444444] bg-[#0a0a0a] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[#ffffff] hover:border-white disabled:opacity-40 active:scale-[0.98]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Pay &amp; unlock
              </button>
            )}
            <button
              type="button"
              onClick={() => void copyInvoice()}
              disabled={!invoice}
              className="flex items-center gap-1 border border-[#333333] px-3 py-2 text-[10px] uppercase tracking-widest text-[#888888] hover:border-white hover:text-white disabled:opacity-30"
            >
              <Copy className="h-3 w-3" /> Copy BOLT11
            </button>
          </div>

          {invoice && (
            <div className="border border-[#222222] bg-[#0a0a0a] p-3 text-[11px]">
              <p className="uppercase tracking-widest text-[#555555]">Invoice ({amountSats} sats)</p>
              <p className="mt-2 break-all text-[10px] text-[#aaaaaa]">{invoice}</p>
            </div>
          )}

          {error && (
            <div className="border border-[#444444] bg-[#111111] p-3 text-[12px] text-[#888888]">{error}</div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-[#ffffff] bg-[#111111] p-4"
            >
              <p className="text-[10px] uppercase tracking-widest text-[#555555]">Result</p>
              <p className="mt-2 text-[14px] leading-relaxed text-[#ffffff]">{result}</p>
              <p className="mt-3 text-right text-[10px] uppercase tracking-widest text-[#555555]">
                {amountSats} sats charged
              </p>
            </motion.div>
          )}
        </div>
      </div>

      <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="mb-3 text-center text-[10px] uppercase tracking-widest text-[#555555]">Payment path</p>
        <BtcAgentViz state={vizState} />
      </div>

      <div className="border border-[#1a1a1a] bg-[#111111]">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-[#333333]" />
          <span className="h-2 w-2 rounded-full bg-[#444444]" />
          <span className="h-2 w-2 rounded-full bg-[#555555]" />
          <span className="ml-2 text-[10px] uppercase tracking-widest text-[#555555]">l402-demo.log</span>
        </div>
        <div className="max-h-48 space-y-1 overflow-auto p-3 text-[11px] leading-relaxed text-[#aaaaaa]">
          {logLines.length === 0 && <p className="text-[#555555]">$ waiting…</p>}
          {logLines.map((line, i) => (
            <p key={i} className="break-words">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
