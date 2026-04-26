"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { api, type ReputationSummary } from "@/lib/api";
import { ensureBitcoinConnectInit } from "@/lib/bitcoin-connect-init";
import { WalletConnect } from "@/components/wallet-connect";
import { cn } from "@/lib/utils";
import { formatAgentReplyAsPlainText } from "@/lib/format-agent-plain";

interface ChatMessage {
  role: "user" | "agent";
  content: string;
}

const formatError = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export type PaidAgentConversationProps = {
  agentAddress: string;
  agentName: string;
  agentDescription: string;
  embedded?: boolean;
};

function MessageBubble({ role, content }: { role: "user" | "agent"; content: string }) {
  const isUser = role === "user";
  const isImageData = content.startsWith("data:image/");
  const displayText = !isUser && !isImageData ? formatAgentReplyAsPlainText(content) : content;
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          isUser ? "bg-[#1a1a1a] text-[#fafafa]" : "bg-[#111111] text-[#e5e5e5] ring-1 ring-[#262626]"
        )}
      >
        {isImageData ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={content} alt="Generated" className="max-h-80 rounded-lg border border-[#333]" />
        ) : (
          <p className="whitespace-pre-wrap">{displayText}</p>
        )}
      </div>
    </div>
  );
}

export function PaidAgentConversation({
  agentAddress,
  agentName,
  agentDescription,
  embedded = false,
}: PaidAgentConversationProps) {
  const isBuilderAgent = agentAddress.startsWith("agent_");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [message, setMessage] = useState("");
  const [preimage, setPreimage] = useState("");
  const [macaroon, setMacaroon] = useState("");
  const [invoice, setInvoice] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState("web-user-pending");
  const [reputation, setReputation] = useState<ReputationSummary | null>(null);
  const [hasPaidThisSession, setHasPaidThisSession] = useState(false);
  const [ratingDraft, setRatingDraft] = useState({ stars: 0, comment: "" });
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingMessage, setRatingMessage] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerHits, setPlannerHits] = useState<{ id: string; name: string; address: string; reason: string }[]>(
    []
  );
  const preimageRef = useRef(preimage);
  preimageRef.current = preimage;

  const paymentGateActive =
    Boolean(invoice) && (isBuilderAgent ? Boolean(checkoutId) : Boolean(macaroon));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat, paymentGateActive, loading]);

  useEffect(() => {
    const storageKey = "shotenx-user-id";
    const fromStorage = window.localStorage.getItem(storageKey);
    if (fromStorage && fromStorage.trim()) {
      setUserId(fromStorage.trim());
      return;
    }
    const generated = `agent-user-${crypto.randomUUID().slice(0, 8)}`;
    window.localStorage.setItem(storageKey, generated);
    setUserId(generated);
  }, []);

  useEffect(() => {
    if (!isBuilderAgent) return;
    let alive = true;
    const refresh = async () => {
      const summary = await api.getAgentReputation(agentAddress);
      if (alive) setReputation(summary);
    };
    void refresh();
    const id = setInterval(() => void refresh(), 12000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [isBuilderAgent, agentAddress]);

  const submitRating = async () => {
    if (!ratingDraft.stars || ratingSubmitting) return;
    setRatingSubmitting(true);
    setRatingMessage("");
    try {
      const { summary } = await api.submitAgentRating({
        agentId: agentAddress,
        stars: ratingDraft.stars,
        raterId: userId,
        comment: ratingDraft.comment.trim() || undefined,
        checkoutId: checkoutId || undefined,
      });
      setReputation(summary);
      setRatingDraft({ stars: 0, comment: "" });
      setRatingMessage("Thanks — your rating was saved.");
      setShowRating(false);
    } catch (err) {
      setRatingMessage(err instanceof Error ? err.message : "Could not submit rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const pushMessage = (role: ChatMessage["role"], content: string) => {
    setChat((prev) => [...prev, { role, content }]);
  };

  const requestPaidResponse = async (authorization?: string): Promise<"challenge" | "success"> => {
    const response = await api.queryPaidAgent({
      agentAddress,
      message,
      userId,
      authorization,
    });

    if (response.status === 402) {
      const challenge = response.payload?.l402 ?? response.payload ?? {};
      const nextMacaroon = String(challenge?.macaroon ?? "");
      const nextInvoice = String(challenge?.invoice ?? "");
      setMacaroon(nextMacaroon);
      setInvoice(nextInvoice);
      const errCode = formatError(response.payload?.error, "");
      const isChallenge = errCode === "payment_required" || Boolean(nextInvoice && nextMacaroon);
      setHint(
        isChallenge
          ? "Pay below to unlock this reply."
          : "Payment could not start. Try again in a moment."
      );
      return "challenge";
    }

    if (!response.ok) {
      const err = formatError(response.payload?.error, `Request failed (${response.status})`);
      throw new Error(err);
    }

    const answer = String(response.payload?.response ?? "No response");
    pushMessage("agent", answer);
    const paidInvoice = response.payload?.payment?.invoice;
    if (typeof paidInvoice === "string" && paidInvoice) setInvoice(paidInvoice);
    setHasPaidThisSession(true);
    setHint("");
    return "success";
  };

  const requestBuilderPaidResponse = async (authorization?: string): Promise<"challenge" | "success"> => {
    const response = await api.runBuilderAgent({
      id: agentAddress,
      input: message,
      buyerId: userId,
      authorization,
    });

    if (response.status === 402) {
      const challenge = (response.payload as Record<string, unknown>)?.l402 as
        | { checkoutId?: string; paymentRequest?: string }
        | undefined;
      setInvoice(String(challenge?.paymentRequest ?? ""));
      setCheckoutId(String(challenge?.checkoutId ?? ""));
      setHint("Pay below to unlock this reply.");
      return "challenge";
    }

    if (!response.ok) {
      throw new Error(
        formatError(
          (response.payload as Record<string, unknown>)?.error,
          `Request failed (${response.status})`
        )
      );
    }

    const payload = response.payload as {
      result?: { text?: string; summary?: string; imageUrl?: string; imageDataUrl?: string; review?: string };
    };
    const result = payload.result;
    const answer =
      result?.text ??
      result?.summary ??
      result?.review ??
      result?.imageDataUrl ??
      result?.imageUrl ??
      JSON.stringify(result ?? {});
    pushMessage("agent", answer);
    setHasPaidThisSession(true);
    setHint("");
    return "success";
  };

  useEffect(() => {
    if (!plannerOpen || !message.trim() || message.trim().length < 16) {
      setPlannerHits([]);
      return;
    }
    const t = window.setTimeout(() => {
      setPlannerLoading(true);
      void api
        .suggestAgentsByPrompt(message.trim())
        .then((rows) => {
          setPlannerHits(
            rows.map((r) => ({
              id: r.id,
              name: r.name,
              address: r.address,
              reason: r.reason,
            }))
          );
        })
        .catch(() => setPlannerHits([]))
        .finally(() => setPlannerLoading(false));
    }, 500);
    return () => window.clearTimeout(t);
  }, [plannerOpen, message]);

  const unlockWithPreimage = async (proofHex: string) => {
    const proof = proofHex.trim();
    if (!proof) return;
    if (isBuilderAgent) {
      if (!checkoutId) throw new Error("Missing payment session. Send your message again.");
      const phase = await requestBuilderPaidResponse(`L402 ${checkoutId}:${proof}`);
      if (phase === "success") setMessage("");
    } else {
      if (!macaroon) throw new Error("Missing payment session. Send your message again.");
      const phase = await requestPaidResponse(`L402 ${macaroon}:${proof}`);
      if (phase === "success") setMessage("");
    }
    setPreimage("");
    setMacaroon("");
    setInvoice("");
    setCheckoutId("");
  };

  const handleSend = async () => {
    if (!message.trim() || loading) return;
    if (paymentGateActive) {
      setHint("Finish payment below before sending another message.");
      return;
    }
    setLoading(true);
    setHint("");
    const text = message.trim();
    pushMessage("user", text);
    try {
      if (isBuilderAgent) {
        const phase = await requestBuilderPaidResponse();
        if (phase === "success") setMessage("");
      } else {
        const phase = await requestPaidResponse();
        if (phase === "success") setMessage("");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Something went wrong.";
      pushMessage("agent", msg);
      setHint("");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!preimage.trim()) return;
    setLoading(true);
    setHint("");
    try {
      await unlockWithPreimage(preimage);
    } catch (error) {
      pushMessage("agent", error instanceof Error ? error.message : "Unlock failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPay = async () => {
    if (!invoice) return;
    setLoading(true);
    setHint("");
    try {
      let resolvedPreimage = "";
      try {
        const mod = await ensureBitcoinConnectInit();
        const provider = await mod.requestProvider();
        const payment = (await provider.sendPayment(invoice)) as Record<string, unknown>;
        const candidate = [
          payment.preimage,
          payment.payment_preimage,
          payment.paymentPreimage,
        ].find((value) => typeof value === "string" && value.trim());
        resolvedPreimage = String(candidate ?? "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/already been paid|already paid|duplicate payment/i.test(msg)) {
          const pasted = preimageRef.current.trim();
          if (pasted) {
            setHint("Invoice already settled — confirming with your proof…");
            try {
              await unlockWithPreimage(pasted);
            } catch (unlockErr) {
              setHint(unlockErr instanceof Error ? unlockErr.message : "Unlock failed.");
            } finally {
              setLoading(false);
            }
            return;
          }
          setHint("This invoice was already paid — paste the payment proof (hex) above, then tap “I paid — unlock reply”.");
          setLoading(false);
          return;
        }
        resolvedPreimage = "";
      }

      if (!resolvedPreimage) {
        throw new Error("Wallet did not complete payment. Connect the wallet and try again.");
      }

      await unlockWithPreimage(resolvedPreimage);
    } catch (error) {
      setHint(error instanceof Error ? error.message : "Payment failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#0a0a0a]">
      <header className="shrink-0 border-b border-[#1a1a1a] px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-medium text-[#fafafa]">{agentName}</h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-[#737373]">{agentDescription}</p>
            <p className="mt-1 truncate font-mono text-[10px] text-[#525252]">{agentAddress}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isBuilderAgent && reputation && reputation.ratingCount > 0 && (
              <span className="text-xs text-[#a3a3a3]">
                ★ {reputation.averageStars.toFixed(1)} · {reputation.ratingCount}
              </span>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/marketplace" className="text-xs text-[#737373] transition-colors hover:text-white">
                Marketplace
              </Link>
              {!embedded && (
                <>
                  <Link href="/" className="text-xs text-[#737373] transition-colors hover:text-white">
                    Home
                  </Link>
                  <WalletConnect />
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
          {chat.length === 0 && !paymentGateActive && (
            <p className="text-center text-sm text-[#737373]">Ask anything. You may be asked to pay in-chat before the agent replies.</p>
          )}

          {chat.map((item, index) => (
            <MessageBubble key={`${item.role}-${index}`} role={item.role} content={item.content} />
          ))}

          {paymentGateActive && (
            <div className="rounded-2xl border border-[#333333] bg-[#111111] p-5 ring-1 ring-white/5">
              <p className="text-sm font-medium text-white">Payment to continue</p>
              <p className="mt-1 text-xs leading-relaxed text-[#a3a3a3]">
                Use your wallet, then confirm. Your message stays in this thread — no need to send again.
              </p>
              <details className="mt-4 group">
                <summary className="cursor-pointer text-xs text-[#737373] transition-colors hover:text-[#d4d4d4]">
                  Show invoice
                </summary>
                <pre className="mt-2 max-h-32 overflow-auto break-all rounded-lg bg-[#0a0a0a] p-3 font-mono text-[10px] leading-relaxed text-[#a3a3a3]">
                  {invoice}
                </pre>
              </details>
              <label className="mt-4 block text-xs font-medium text-[#a3a3a3]">Payment proof (hex)</label>
              <input
                value={preimage}
                onChange={(e) => setPreimage(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#262626] bg-[#0a0a0a] px-3 py-2.5 font-mono text-xs text-white outline-none placeholder:text-[#525252] focus:border-[#525252]"
                placeholder="Paste after paying in your wallet"
                spellCheck={false}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleUnlock()}
                  disabled={loading || !preimage.trim()}
                  className="rounded-xl bg-white px-4 py-2.5 text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {loading ? "…" : "I paid — unlock reply"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleAutoPay()}
                  disabled={loading}
                  className="rounded-xl border border-[#404040] bg-transparent px-4 py-2.5 text-xs font-medium text-[#e5e5e5] transition-colors hover:bg-[#171717] disabled:opacity-40"
                >
                  Pay with wallet
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-[#737373]">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#a3a3a3]" />
              Working…
            </div>
          )}
        </div>
      </div>

      <footer className="shrink-0 border-t border-[#1a1a1a] bg-[#0a0a0a] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto max-w-3xl space-y-3">
          {isBuilderAgent && hasPaidThisSession && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#262626] bg-[#111111] px-3 py-2">
              <button
                type="button"
                onClick={() => setShowRating((s) => !s)}
                className="text-xs text-[#a3a3a3] hover:text-white"
              >
                {showRating ? "Hide rating" : "Rate this agent"}
              </button>
              {ratingMessage && <span className="text-xs text-[#737373]">{ratingMessage}</span>}
            </div>
          )}

          {isBuilderAgent && hasPaidThisSession && showRating && (
            <div className="rounded-xl border border-[#262626] bg-[#111111] p-3">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingDraft((p) => ({ ...p, stars: star }))}
                    className={cn(
                      "text-xl leading-none",
                      star <= ratingDraft.stars ? "text-white" : "text-[#404040] hover:text-[#737373]"
                    )}
                    aria-label={`${star} stars`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={ratingDraft.comment}
                onChange={(e) => setRatingDraft((p) => ({ ...p, comment: e.target.value }))}
                rows={2}
                maxLength={500}
                placeholder="Optional note"
                className="mt-2 w-full resize-none rounded-lg border border-[#262626] bg-[#0a0a0a] px-2 py-1.5 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={() => void submitRating()}
                disabled={!ratingDraft.stars || ratingSubmitting}
                className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-black disabled:opacity-40"
              >
                {ratingSubmitting ? "…" : "Submit"}
              </button>
            </div>
          )}

          {!paymentGateActive && (
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
                    Uses LLM search on your draft (16+ characters). Pick an agent to open a paid chat in a new thread.
                  </p>
                  {message.trim().length < 16 ? (
                    <p className="text-xs text-[#737373]">Keep typing your task to see suggestions.</p>
                  ) : plannerLoading ? (
                    <p className="text-xs text-[#737373]">Searching…</p>
                  ) : plannerHits.length === 0 ? (
                    <p className="text-xs text-[#737373]">No close matches yet — try more detail.</p>
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
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-[#262626] bg-[#111111] p-2 ring-1 ring-white/5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={1}
              placeholder={paymentGateActive ? "Complete payment above first…" : "Message…"}
              disabled={paymentGateActive}
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-[#fafafa] outline-none placeholder:text-[#525252] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={loading || !message.trim() || paymentGateActive}
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
