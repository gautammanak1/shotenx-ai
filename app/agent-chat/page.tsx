"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { WalletConnect } from "@/components/wallet-connect";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/components/theme-provider";

type TimelineStep = { label: string; state: "done" | "failed" };
type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  source?: string;
  timeline?: TimelineStep[];
};
type ChatSession = { id: string; title: string; updatedAt: string; messages: Message[] };
type LocalAttachment = { id: string; name: string; type: string; size: number; content: string };

const HISTORY_KEY = "shotenx_agent_chat_history_v1";
const toText = (v: unknown) => { if (typeof v === "string") return v; try { return JSON.stringify(v); } catch { return "No response"; } };

export default function AgentChatPage() {
  const [prompt, setPrompt] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [status, setStatus] = useState("Ready");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [speechEnabled, setSpeechEnabled] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const saved = window.localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ChatSession[];
        if (Array.isArray(parsed) && parsed.length > 0) { setSessions(parsed); setActiveSessionId(parsed[0].id); return; }
      } catch { /* fall through */ }
    }
    const init: ChatSession = { id: `session-${Date.now()}`, title: "New chat", updatedAt: new Date().toISOString(), messages: [{ role: "system", source: "auto-router", content: "Ask anything. The system picks the best agent, pays automatically, and returns result." }] };
    setSessions([init]);
    setActiveSessionId(init.id);
  }, []);

  useEffect(() => { if (sessions.length > 0) window.localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions)); }, [sessions]);

  useEffect(() => {
    setSpeechSupported(typeof window !== "undefined" && Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition
    ));
  }, []);

  const activeSession = useMemo(() => sessions.find((s) => s.id === activeSessionId) ?? null, [sessions, activeSessionId]);
  const messages = activeSession?.messages ?? [];

  // auto-scroll to latest message
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const filteredSessions = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    const list = [...sessions].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return q ? list.filter((s) => `${s.title} ${s.messages.map((m) => m.content).join(" ")}`.toLowerCase().includes(q)) : list;
  }, [historySearch, sessions]);

  const upsert = (fn: (s: ChatSession) => ChatSession) => setSessions((prev) => prev.map((s) => s.id !== activeSessionId ? s : fn(s)));

  const createNewChat = () => {
    const s: ChatSession = { id: `session-${Date.now()}`, title: "New chat", updatedAt: new Date().toISOString(), messages: [{ role: "system", source: "auto-router", content: "Ask anything. The system picks the best agent, pays automatically, and returns result." }] };
    setSessions((p) => [s, ...p]); setActiveSessionId(s.id); setPrompt(""); setAttachments([]); setStatus("Ready");
  };

  const speak = (text: string) => { if (!speechEnabled || !window.speechSynthesis) return; window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); };

  const toggleListening = () => {
    if (!speechSupported || loading) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const w = window as unknown as Record<string, { new(): { lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { results: { [i: number]: { [i: number]: { transcript: string } } } }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null; start: () => void; stop: () => void } }>;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => setPrompt(Array.from(e.results as unknown as ArrayLike<{ 0: { transcript: string } }>).map((r) => r[0]?.transcript ?? "").join(" ").trim());
    rec.onerror = () => { setStatus("Audio input error."); setListening(false); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec; rec.start(); setListening(true);
  };

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const parsed = await Promise.all(Array.from(files).slice(0, 5).map(async (file) => {
      const isText = file.type.startsWith("text/") || /\.(md|json|ts|tsx|js|py)$/.test(file.name);
      return { id: `${file.name}-${Date.now()}`, name: file.name, type: file.type || "application/octet-stream", size: file.size, content: isText ? (await file.text()).slice(0, 6000) : "" } satisfies LocalAttachment;
    }));
    setAttachments((p) => [...p, ...parsed]);
  };

  const payWithWallet = async (invoice: string) => {
    const { requestProvider } = await import("@getalby/bitcoin-connect");
    const provider = await requestProvider();
    const payment = (await provider.sendPayment(invoice)) as Record<string, unknown>;
    const preimage = [payment.preimage, payment.payment_preimage, payment.paymentPreimage].find((v) => typeof v === "string" && (v as string).trim());
    if (!preimage || typeof preimage !== "string") throw new Error("Wallet payment did not return a preimage.");
    return preimage;
  };

  const runPrompt = async () => {
    if (!prompt.trim() || loading || !activeSessionId) return;
    const userPrompt = prompt.trim();
    const filesCtx = attachments.length > 0 ? `\n\nAttached files:\n${attachments.map((f) => f.content ? `- ${f.name}:\n${f.content}` : `- ${f.name} (binary)`).join("\n\n")}` : "";

    upsert((s) => ({ ...s, updatedAt: new Date().toISOString(), title: s.title === "New chat" ? userPrompt.slice(0, 60) : s.title, messages: [...s.messages, { role: "user", source: "user", content: attachments.length > 0 ? `${userPrompt}\n\n[Files: ${attachments.map((f) => f.name).join(", ")}]` : userPrompt }] }));
    setPrompt(""); setAttachments([]); setLoading(true); setStatus("Searching best agent...");

    try {
      const buyerId = `chat-user-${Date.now()}`;
      let res = await api.autoRunSmartAgentWithPayment({ prompt: `${userPrompt}${filesCtx}`, buyerId });

      if (res.status === 402) {
        const l402 = (res.payload.l402 ?? {}) as { checkoutId?: string; paymentRequest?: string; amountSats?: number };
        const agent = (res.payload.selectedAgent ?? {}) as { id?: string };
        if (!l402.checkoutId || !l402.paymentRequest || !agent.id) throw new Error(String(res.payload.error ?? "Payment challenge incomplete."));
        setStatus(`Payment required (${l402.amountSats ?? "?"} sats). Approve wallet...`);
        const preimage = await payWithWallet(l402.paymentRequest);
        setStatus("Payment sent. Unlocking response...");
        res = await api.autoRunSmartAgentWithPayment({ prompt: `${userPrompt}${filesCtx}`, buyerId, checkoutId: l402.checkoutId, preimage, agentId: agent.id });
      }

      if (!res.ok) throw new Error(String(res.payload.error ?? res.payload.message ?? "Run failed"));

      const result = res.payload as { selectedAgent: { name: string; type: "content" | "image" | "code" }; payment: { amountSats: number; status?: string }; warning?: string; result: { text?: string; summary?: string; imageUrl?: string } };
      const skipped = result.payment?.status === "skipped";
      const statusMsg = skipped ? `Selected ${result.selectedAgent.name}. ${result.warning ?? "Payment skipped."}` : `Paid ${result.payment.amountSats} sats. Selected ${result.selectedAgent.name}.`;
      setStatus(statusMsg);
      toast(skipped ? `Agent: ${result.selectedAgent.name}` : `Paid ${result.payment.amountSats} sats ⚡`, skipped ? "info" : "success");
      const content = result.result.text ?? result.result.summary ?? result.result.imageUrl ?? toText(result.result);
      upsert((s) => ({ ...s, updatedAt: new Date().toISOString(), messages: [...s.messages, { role: "assistant", source: `builder-${result.selectedAgent.type}`, content, timeline: [{ label: "Agent selected", state: "done" }, { label: skipped ? "Payment skipped (wallet not configured)" : `L402 paid (${result.payment.amountSats} sats)`, state: "done" }, { label: "Execution complete", state: "done" }] }] }));
      speak(content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Run failed";
      setStatus(msg);
      toast(msg, "error");
      upsert((s) => ({ ...s, updatedAt: new Date().toISOString(), messages: [...s.messages, { role: "assistant", source: "auto-router", content: msg, timeline: [{ label: "Agent selected", state: "done" }, { label: "Payment or execution failed", state: "failed" }] }] }));
    } finally { setLoading(false); }
  };

  const badgeClass = (source?: string) => {
    if (source?.startsWith("builder")) return "border-violet-400/40 text-violet-500";
    if (source === "user") return "border-emerald-400/40 text-emerald-500";
    return "border-border text-muted-foreground";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-5">
          <span className="text-sm font-semibold text-foreground">Agent Chat</span>
          <div className="flex items-center gap-2">
            <WalletConnect />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 lg:grid-cols-[280px,1fr]">
            {/* History */}
            <aside className="rounded-xl border bg-card p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold">History</p>
                <button onClick={createNewChat} className="rounded-md border px-2 py-1 text-xs">New Chat</button>
              </div>
              <input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search history..." className="mb-3 w-full rounded-md border bg-background px-2 py-2 text-xs outline-none" />
              <div className="max-h-[68vh] space-y-2 overflow-auto">
                {filteredSessions.map((s) => (
                  <button key={s.id} onClick={() => setActiveSessionId(s.id)}
                    className={`w-full rounded-md border p-2 text-left text-xs ${s.id === activeSessionId ? "border-violet-500 bg-violet-500/10" : "bg-background"}`}>
                    <p className="truncate font-medium">{s.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{new Date(s.updatedAt).toLocaleString()}</p>
                  </button>
                ))}
              </div>
            </aside>

            {/* Chat */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Agent Chat</h1>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSpeechEnabled((p) => !p)} className={`rounded-md border px-3 py-1.5 text-sm ${speechEnabled ? "border-violet-500" : ""}`}>
                    Audio {speechEnabled ? "On" : "Off"}
                  </button>
                  <Link href="/marketplace" className="rounded-md border px-3 py-1.5 text-sm">Marketplace</Link>
                  <Link href="/leaderboard" className="rounded-md border px-3 py-1.5 text-sm">Leaderboard</Link>
                </div>
              </div>

              <div className="h-[60vh] space-y-3 overflow-auto rounded-xl border bg-card p-4">
                {messages.map((msg, idx) => (
                  <div key={`${msg.role}-${idx}`}
                    className={`max-w-[85%] rounded-md p-3 text-sm ${msg.role === "user" ? "ml-auto bg-violet-600 text-white" : msg.role === "assistant" ? "bg-muted" : "border bg-background text-muted-foreground"}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide opacity-75">{msg.role}</span>
                      {msg.source && <span className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${badgeClass(msg.source)}`}>{msg.source}</span>}
                      {msg.role === "assistant" && <button onClick={() => speak(msg.content)} className="rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">Speak</button>}
                    </div>
                    {msg.content}
                    {msg.timeline && msg.timeline.length > 0 && (
                      <div className="mt-3 space-y-1 border-t border-border/60 pt-2">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Payment timeline</p>
                        {msg.timeline.map((step, i) => (
                          <p key={i} className={`text-[11px] ${step.state === "done" ? "text-emerald-500" : "text-red-500"}`}>
                            {step.state === "done" ? "✓" : "✕"} {step.label}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="rounded-xl border bg-card p-4">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4}
                  placeholder="Ask anything, for example: create a LinkedIn post about Lightning payments"
                  className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:border-violet-500/50 transition-colors" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-md border px-3 py-1.5 text-xs">
                    Attach Files
                    <input type="file" multiple onChange={(e) => void handleAttachFiles(e.target.files)} className="hidden" />
                  </label>
                  <button onClick={toggleListening} disabled={!speechSupported} className="rounded-md border px-3 py-1.5 text-xs disabled:opacity-60">
                    {listening ? "Stop Mic" : "Voice Input"}
                  </button>
                  {attachments.length > 0 && <button onClick={() => setAttachments([])} className="rounded-md border px-3 py-1.5 text-xs">Clear Files</button>}
                </div>
                {attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((f) => <span key={f.id} className="rounded-full border px-2 py-1 text-[11px]">{f.name}</span>)}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{status}</p>
                  <button onClick={runPrompt} disabled={loading || !prompt.trim()} className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors disabled:opacity-60">
                    {loading ? "Running + Paying..." : "Run Prompt"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
