"use client";

import { useState } from "react";
import Link from "next/link";
import { useCheckout } from "@moneydevkit/nextjs";
import { useL402Request } from "@/lib/useL402Request";

export default function ChatPayPage() {
  const { createCheckout, isLoading } = useCheckout();
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("Create a checkout before running premium tasks.");
  const [priceSats, setPriceSats] = useState(30);
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [l402Status, setL402Status] = useState("Ready to call paid image API.");
  const { callPaidApi, state: l402State } = useL402Request();

  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

  const handleCheckout = async () => {
    setStatus("Creating MoneyDevKit checkout...");
    const result = await createCheckout({
      type: "AMOUNT",
      title: "ShotenX Premium Agent Task",
      description: "Pay-per-task checkout for premium agent responses",
      amount: priceSats,
      currency: "SAT",
      successUrl: "/checkout/success",
      metadata: {
        source: "shotenx-paid-chat",
        promptPreview: prompt.slice(0, 60)
      }
    });

    if (result.error) {
      setStatus(result.error.message);
      return;
    }

    if (result.data?.checkoutUrl) {
      window.location.href = result.data.checkoutUrl;
    }
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setL402Status("Calling paid endpoint...");
    setImageDataUrl("");
    try {
      const payload = await callPaidApi<{
        ok: boolean;
        result?: { imageDataUrl?: string; imageUrl?: string; note?: string };
      }>(`${backendBase}/api/tools/generate-image`, {
        prompt: imagePrompt,
        amountSats: 10,
        agentId: "frontend-l402-demo",
        buyerId: "demo-user"
      });

      if (!payload.ok || !payload.result) {
        setL402Status("API returned no result.");
        return;
      }

      setImageDataUrl(payload.result.imageDataUrl ?? payload.result.imageUrl ?? "");
      setL402Status(payload.result.note ?? "Paid image generated successfully.");
    } catch (error) {
      setL402Status(error instanceof Error ? error.message : "Paid image request failed");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Paid Chat (MoneyDevKit)</h1>
          <div className="flex items-center gap-2">
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

        <div className="rounded-xl border bg-white p-4">
          <label className="mb-2 block text-sm font-medium">Agent task prompt</label>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            placeholder="Describe what the premium agent should do..."
            className="w-full rounded-md border p-3 text-sm outline-none"
          />

          <div className="mt-3 flex items-center gap-3">
            <label className="text-sm">Amount (SAT)</label>
            <input
              type="number"
              min={1}
              value={priceSats}
              onChange={(event) => setPriceSats(Number(event.target.value))}
              className="h-9 w-28 rounded-md border px-2 text-sm"
            />
            <button
              onClick={handleCheckout}
              disabled={isLoading || !prompt.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isLoading ? "Creating..." : "Pay & Continue"}
            </button>
          </div>
        </div>

        <p className="rounded-md border bg-white p-3 text-sm">{status}</p>
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h2 className="text-lg font-semibold">L402 Paid API Demo</h2>
          <p className="text-sm text-slate-600">
            This calls backend `/api/tools/generate-image` protected by Lightning L402.
          </p>
          <textarea
            value={imagePrompt}
            onChange={(event) => setImagePrompt(event.target.value)}
            rows={3}
            placeholder="Describe the image you want..."
            className="w-full rounded-md border p-3 text-sm outline-none"
          />
          <button
            onClick={handleGenerateImage}
            disabled={l402State.loading || !imagePrompt.trim()}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {l402State.loading ? "Processing payment..." : "Generate Image (10 sats)"}
          </button>
          {l402State.invoice && (
            <div className="rounded-md border p-3 text-xs">
              <p className="font-semibold">Invoice challenge received</p>
              <p className="mt-1 break-all text-slate-600">{l402State.invoice}</p>
            </div>
          )}
          <p className="rounded-md border p-3 text-sm">{l402Status}</p>
          {imageDataUrl && (
            <img src={imageDataUrl} alt="Paid generated result" className="max-h-80 rounded-md border" />
          )}
        </div>
        <div className="rounded-xl border bg-white p-4 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Auth and payment notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            <li>Wallet auth for Alby L402 flows uses NWC URL, not API key in frontend code.</li>
            <li>Keep `AGENTVERSE_TOKEN` and any wallet secrets on server only.</li>
            <li>For webhook notifications, configure MoneyDevKit endpoint to `/api/mdk` on your app domain.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
