"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { WalletConnect } from "@/components/wallet-connect";

interface ChatMessage {
  role: "user" | "agent" | "system";
  content: string;
}

const formatError = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

export default function AgentChatPage() {
  const params = useParams<{ agentAddress: string }>();
  const searchParams = useSearchParams();
  const agentAddress = decodeURIComponent(params.agentAddress);
  const agentName = searchParams.get("name") ?? "Unknown agent";
  const agentDescription =
    searchParams.get("description") ?? "No description available.";
  const isBuilderAgent = agentAddress.startsWith("agent_");

  const [message, setMessage] = useState("");
  const [preimage, setPreimage] = useState("");
  const [macaroon, setMacaroon] = useState("");
  const [invoice, setInvoice] = useState("");
  const [checkoutId, setCheckoutId] = useState("");
  const [status, setStatus] = useState(
    "Send a prompt to request a paid agent response."
  );
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState("web-user-pending");
  const [paidMode, setPaidMode] = useState(true);

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

  const pushMessage = (role: ChatMessage["role"], content: string) => {
    setChat((prev) => [...prev, { role, content }]);
  };

  const requestPaidResponse = async (authorization?: string) => {
    const response = await api.queryPaidAgent({
      agentAddress,
      message,
      userId,
      authorization,
      autoPay: !authorization
    });

    if (response.status === 402) {
      const challenge = response.payload?.l402 ?? response.payload ?? {};
      const autoPayError = formatError(
        response.payload?.error,
        "auto_payment_failed"
      );
      const nextMacaroon = String(challenge?.macaroon ?? "");
      const nextInvoice = String(challenge?.invoice ?? "");
      setMacaroon(nextMacaroon);
      setInvoice(nextInvoice);
      setStatus(
        `Auto payment failed: ${autoPayError}. Pay invoice manually, paste preimage, then unlock.`
      );
      pushMessage("system", `Payment required (${autoPayError}). Manual fallback enabled.`);
      return;
    }

    if (!response.ok) {
      const error = formatError(response.payload?.error, "Request failed");
      throw new Error(error);
    }

    const answer = String(response.payload?.response ?? "No response");
    pushMessage("agent", answer);
    const paidInvoice = response.payload?.payment?.invoice;
    if (typeof paidInvoice === "string" && paidInvoice) {
      setInvoice(paidInvoice);
    }
    setStatus("Paid response unlocked. Invoice generated and paid via Alby.");
  };

  const requestBuilderPaidResponse = async (authorization?: string) => {
    const response = await api.runBuilderAgent({
      id: agentAddress,
      input: message,
      buyerId: userId,
      authorization
    });

    if (response.status === 402) {
      const challenge = (response.payload as Record<string, unknown>)?.l402 as
        | { checkoutId?: string; paymentRequest?: string }
        | undefined;
      const nextInvoice = String(challenge?.paymentRequest ?? "");
      const nextCheckout = String(challenge?.checkoutId ?? "");
      setInvoice(nextInvoice);
      setCheckoutId(nextCheckout);
      setStatus("Payment required. Pay invoice, then unlock response.");
      pushMessage("system", "L402 challenge received for this agent.");
      return;
    }

    if (!response.ok) {
      throw new Error(formatError((response.payload as Record<string, unknown>)?.error, "Request failed"));
    }

    const payload = response.payload as {
      result?: { text?: string; summary?: string; imageUrl?: string };
    };
    const result = payload.result;
    const answer =
      result?.text ?? result?.summary ?? result?.imageUrl ?? JSON.stringify(result ?? {});
    pushMessage("agent", answer);
    setStatus("Paid builder response unlocked.");
  };

  const handleSend = async () => {
    if (!message.trim() || loading) return;
    setLoading(true);
    pushMessage("user", message.trim());
    try {
      if (paidMode) {
        if (isBuilderAgent) {
          await requestBuilderPaidResponse();
        } else {
          await requestPaidResponse();
        }
      } else {
        const response = await api.queryAgentDirect({
          agentAddress,
          message,
          userSeed: userId
        });

        if (!response.ok) {
          throw new Error(formatError(response.payload?.error, "Agent call failed"));
        }

        const answer = String(response.payload?.response ?? "No response");
        pushMessage("agent", answer);
        setStatus("Direct agent response received.");
      }
      setMessage("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Agent request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!preimage) return;
    setLoading(true);
    try {
      if (isBuilderAgent) {
        if (!checkoutId) {
          setStatus("Missing checkout id for this payment challenge.");
          return;
        }
        await requestBuilderPaidResponse(`L402 ${checkoutId}:${preimage}`);
      } else {
        if (!macaroon) {
          setStatus("Missing macaroon for this payment challenge.");
          return;
        }
        await requestPaidResponse(`L402 ${macaroon}:${preimage}`);
      }
      setPreimage("");
      setMacaroon("");
      setInvoice("");
      setCheckoutId("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unlock failed");
    } finally {
      setLoading(false);
    }
  };

  const handleAutoPay = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      let resolvedPreimage = "";

      try {
        const { requestProvider } = await import("@getalby/bitcoin-connect");
        const provider = await requestProvider();
        const payment = (await provider.sendPayment(invoice)) as Record<string, unknown>;
        const candidate = [
          payment.preimage,
          payment.payment_preimage,
          payment.paymentPreimage
        ].find((value) => typeof value === "string" && value.trim());
        resolvedPreimage = String(candidate ?? "");
      } catch {
        resolvedPreimage = "";
      }

      if (!resolvedPreimage) {
        throw new Error("Wallet payment failed. Connect wallet and approve payment.");
      }

      setPreimage(resolvedPreimage);
      setStatus("Invoice paid. Unlocking response...");
      if (isBuilderAgent) {
        if (!checkoutId) throw new Error("Missing checkout id from challenge");
        await requestBuilderPaidResponse(`L402 ${checkoutId}:${resolvedPreimage}`);
      } else {
        if (!macaroon) throw new Error("Missing macaroon from challenge");
        await requestPaidResponse(`L402 ${macaroon}:${resolvedPreimage}`);
      }
      setPreimage("");
      setMacaroon("");
      setInvoice("");
      setCheckoutId("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Auto payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Agent Chat</h1>
          <div className="flex items-center gap-2">
            <WalletConnect />
            <Link href="/agent-chat" className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white">
              Start using agents
            </Link>
            <Link href="/alby" className="rounded-md border px-3 py-1.5 text-sm">
              Alby Setup
            </Link>
            <Link href="/marketplace" className="rounded-md border px-3 py-1.5 text-sm">
              Marketplace
            </Link>
            <Link href="/" className="rounded-md border px-3 py-1.5 text-sm">
              Home
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Agent</p>
          <p className="text-base font-semibold">{agentName}</p>
          <p className="mt-1 text-sm text-muted-foreground">{agentDescription}</p>
          <p className="mt-3 text-sm text-muted-foreground">Agent address</p>
          <p className="break-all text-sm font-medium">{agentAddress}</p>
        </div>

        <div className="h-[46vh] overflow-auto rounded-xl border bg-card p-4">
          {chat.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            <div className="space-y-3">
              {chat.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`rounded-md p-3 text-sm ${
                    item.role === "user"
                      ? "ml-auto max-w-[80%] bg-blue-600 text-white"
                      : item.role === "agent"
                      ? "max-w-[85%] bg-muted"
                      : "max-w-[85%] border bg-card"
                  }`}
                >
                  <p className="mb-1 text-xs uppercase text-muted-foreground">{item.role}</p>
                  <p>{item.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Ask something from this agent..."
            className="w-full rounded-md border p-3 text-sm outline-none"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleSend}
              disabled={loading || !message.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {loading ? "Sending..." : paidMode ? "Send (L402 protected)" : "Send (Direct Agent Chat)"}
            </button>
            <button
              onClick={() => setPaidMode((prev) => !prev)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              {paidMode ? "Switch to Direct Mode" : "Switch to Paid Mode"}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {paidMode
              ? isBuilderAgent
                ? "Builder paid mode: endpoint returns L402 challenge with checkout id and invoice."
                : "Paid mode (default): invoice is generated on each query and paid via Alby NWC. Manual fallback appears only on payment errors."
              : "Direct mode: chat route follows uagent-client bridge flow like uagent-chat-app."}
          </p>
        </div>

        {paidMode && invoice && (
          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-medium">L402 Invoice</p>
            <p className="mt-1 break-all text-xs text-muted-foreground">{invoice}</p>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-muted-foreground">Paste payment preimage after paying invoice</label>
              <input
                value={preimage}
                onChange={(event) => setPreimage(event.target.value)}
                className="h-10 w-full rounded-md border px-3 text-sm"
                placeholder="preimage..."
              />
            </div>
            <button
              onClick={handleUnlock}
              disabled={loading || !preimage.trim()}
              className="mt-3 rounded-md border px-4 py-2 text-sm"
            >
              Unlock paid response
            </button>
            <button
              onClick={handleAutoPay}
              disabled={loading}
              className="mt-3 ml-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              Auto pay with Alby
            </button>
          </div>
        )}

        <p className="rounded-md border bg-card p-3 text-sm">{status}</p>
      </div>
    </main>
  );
}
