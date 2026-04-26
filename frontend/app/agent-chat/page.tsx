"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { api, type LlmAgentSuggestion } from "@/lib/api";
import { ensureBitcoinConnectInit } from "@/lib/bitcoin-connect-init";
import { PublicLayout } from "@/components/public-layout";
import { useToast } from "@/components/theme-provider";
import { PaidAgentConversation } from "@/components/paid-agent-conversation";
import { cn } from "@/lib/utils";
import { formatAgentReplyAsPlainText } from "@/lib/format-agent-plain";

type Message = { role: "user" | "assistant"; content: string };

const toText = (v: unknown) => {
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return "No response";
  }
};

function Bubble({ role, content }: Message) {
  const user = role === "user";
  const isImage = content.startsWith("data:image/");
  const displayText = !user && !isImage ? formatAgentReplyAsPlainText(content) : content;
  return (
    <div className={cn("flex w-full", user ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          user ? "bg-[#1a1a1a] text-[#fafafa]" : "bg-[#111111] text-[#e5e5e5] ring-1 ring-[#262626]"
        )}
      >
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content} alt="" className="max-h-80 rounded-lg border border-[#333]" />
        ) : (
          <p className="whitespace-pre-wrap">{displayText}</p>
        )}
      </div>
    </div>
  );
}

function AgentChatRouterBody() {
  const searchParams = useSearchParams();
  const hiredAddress = searchParams.get("agentAddress")?.trim();
  const hiredName = searchParams.get("name")?.trim() || "Agent";
  const hiredDescription = searchParams.get("description")?.trim() || "";

  if (hiredAddress) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <PaidAgentConversation
          agentAddress={hiredAddress}
          agentName={hiredName}
          agentDescription={hiredDescription || "Marketplace agent"}
          embedded
        />
      </div>
    );
  }

  return <AgentChatAutoRouter />;
}

function AgentChatAutoRouter() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerHits, setPlannerHits] = useState<LlmAgentSuggestion[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!plannerOpen || prompt.trim().length < 16) {
      setPlannerHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setPlannerLoading(true);
      void api
        .suggestAgentsByPrompt(prompt.trim())
        .then(setPlannerHits)
        .catch(() => setPlannerHits([]))
        .finally(() => setPlannerLoading(false));
    }, 500);
    return () => window.clearTimeout(t);
  }, [plannerOpen, prompt]);

  const payWithWallet = async (invoice: string) => {
    const mod = await ensureBitcoinConnectInit();
    const provider = await mod.requestProvider();
    const payment = (await provider.sendPayment(invoice)) as Record<string, unknown>;
    const preimage = [payment.preimage, payment.payment_preimage, payment.paymentPreimage].find(
      (v) => typeof v === "string" && (v as string).trim()
    );
    if (!preimage || typeof preimage !== "string") {
      throw new Error("Wallet did not return payment confirmation.");
    }
    return preimage;
  };

  const runPrompt = async () => {
    if (!prompt.trim() || loading) return;
    const userPrompt = prompt.trim();
    setMessages((m) => [...m, { role: "user", content: userPrompt }]);
    setPrompt("");
    setLoading(true);
    setHint("");
    try {
      const buyerId = `chat-user-${crypto.randomUUID().slice(0, 12)}`;
      let res = await api.autoRunSmartAgentWithPayment({ prompt: userPrompt, buyerId });

      if (res.status === 402) {
        const l402 = (res.payload.l402 ?? {}) as {
          checkoutId?: string;
          paymentRequest?: string;
          amountSats?: number;
        };
        const agent = (res.payload.selectedAgent ?? {}) as { id?: string; name?: string };
        if (!l402.checkoutId || !l402.paymentRequest || !agent.id) {
          throw new Error(String(res.payload.error ?? "Could not start payment."));
        }
        setHint("Approve in your wallet…");
        const preimage = await payWithWallet(l402.paymentRequest);
        setHint("");
        res = await api.autoRunSmartAgentWithPayment({
          prompt: userPrompt,
          buyerId,
          checkoutId: l402.checkoutId,
          preimage,
          agentId: agent.id,
        });
      }

      if (!res.ok) {
        throw new Error(String(res.payload.error ?? res.payload.message ?? "Request failed."));
      }

      const result = res.payload as {
        selectedAgent: { name: string; type: "content" | "image" | "code" };
        payment: { amountSats: number; status?: string };
        warning?: string;
        result: { text?: string; summary?: string; imageUrl?: string; imageDataUrl?: string; review?: string };
      };
      const skipped = result.payment?.status === "skipped";
      if (!skipped) {
        toast(`${result.payment.amountSats} sats · ${result.selectedAgent.name}`, "success");
      }
      const content =
        result.result.text ??
        result.result.summary ??
        result.result.review ??
        result.result.imageDataUrl ??
        result.result.imageUrl ??
        toText(result.result);
      setMessages((m) => [...m, { role: "assistant", content }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast(msg, "error");
      setMessages((m) => [...m, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
      setHint("");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0a0a0a]">
      <header className="shrink-0 border-b border-[#1a1a1a] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <h1 className="text-sm font-medium text-[#fafafa]">Assistant</h1>
            <p className="text-xs text-[#737373]">Picks a specialist and handles payment.</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/marketplace" className="text-[#737373] hover:text-white">
              Marketplace
            </Link>
            <Link href="/create-agent" className="text-[#737373] hover:text-white">
              Create agent
            </Link>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-[#262626] bg-[#111111] px-5 py-8 text-center ring-1 ring-white/5">
              <p className="text-sm text-[#d4d4d4]">What do you need?</p>
              <p className="mt-2 text-xs leading-relaxed text-[#737373]">
                Describe a real task (topic, tone, length). One-liner greetings are skipped so you are not charged by mistake.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <Bubble key={i} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[#737373]">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#a3a3a3]" />
              Working…
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-[#1a1a1a] bg-[#0a0a0a] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="rounded-xl border border-[#262626] bg-[#111111] px-3 py-2">
            <button
              type="button"
              onClick={() => setPlannerOpen((o) => !o)}
              className="text-xs font-medium text-[#d4d4d4] hover:text-white"
            >
              {plannerOpen ? "Hide planner" : "Planner — discover agents"}
            </button>
            {plannerOpen && (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] leading-relaxed text-[#737373]">
                  LLM-ranked agents for what you are typing (16+ chars). Opens a dedicated paid chat with that agent.
                </p>
                {prompt.trim().length < 16 ? (
                  <p className="text-xs text-[#737373]">Keep typing in the box below.</p>
                ) : plannerLoading ? (
                  <p className="text-xs text-[#737373]">Searching…</p>
                ) : plannerHits.length === 0 ? (
                  <p className="text-xs text-[#737373]">No matches — add more context.</p>
                ) : null}
                <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                  {plannerHits.map((h) => (
                    <Link
                      key={h.address}
                      href={`/agent-chat?agentAddress=${encodeURIComponent(h.address)}&name=${encodeURIComponent(h.name)}&description=${encodeURIComponent(h.reason)}&source=planner`}
                      className="inline-flex max-w-full items-center rounded-lg border border-[#333] bg-[#0a0a0a] px-2.5 py-1.5 text-left text-[11px] text-[#e5e5e5] transition-colors hover:border-[#525252] hover:text-white"
                    >
                      <span className="truncate font-medium">{h.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-end gap-2 rounded-2xl border border-[#262626] bg-[#111111] p-2 ring-1 ring-white/5">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void runPrompt();
                }
              }}
              rows={1}
              placeholder="Message…"
              disabled={loading}
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-[#fafafa] outline-none placeholder:text-[#525252] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void runPrompt()}
              disabled={loading || !prompt.trim()}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black transition-opacity hover:opacity-90 disabled:opacity-30"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {hint ? <p className="text-center text-xs text-[#737373]">{hint}</p> : null}
        </div>
      </footer>
    </div>
  );
}

export default function AgentChatPage() {
  return (
    <PublicLayout title="Chat" chatShell>
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-[#737373]">Loading…</div>
        }
      >
        <AgentChatRouterBody />
      </Suspense>
    </PublicLayout>
  );
}
