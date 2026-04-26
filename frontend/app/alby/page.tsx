"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export default function AlbySetupPage() {
  const [protectedUrl, setProtectedUrl] = useState("https://example.com");
  const [amount, setAmount] = useState(1);
  const [nwcUrl, setNwcUrl] = useState("");
  const [description, setDescription] = useState("ShotenX sandbox invoice");
  const [invoice, setInvoice] = useState("");
  const [paymentHash, setPaymentHash] = useState("");
  const [invoiceToPay, setInvoiceToPay] = useState("");
  const [status, setStatus] = useState("Ready");
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [loadingPay, setLoadingPay] = useState(false);
  const [walletInfo, setWalletInfo] = useState<{
    alias?: string;
    pubkey?: string;
    balanceSats?: number;
  }>({});

  const proxyUrl = useMemo(() => {
    if (!protectedUrl.trim() || !nwcUrl.trim()) return "";
    const base = "https://402-proxy.albylabs.com/l402";
    const params = new URLSearchParams({
      url: protectedUrl.trim(),
      nwc_url: nwcUrl.trim(),
      amount: String(Math.max(1, amount))
    });
    return `${base}?${params.toString()}`;
  }, [protectedUrl, nwcUrl, amount]);

  const checkWallet = async () => {
    setLoadingInfo(true);
    try {
      const response = await fetch("/api/alby/info");
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Could not load wallet info");
      }
      setWalletInfo({
        alias: data.alias,
        pubkey: data.pubkey,
        balanceSats: data.balanceSats
      });
      setStatus("Connected to Alby NWC wallet.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet check failed");
    } finally {
      setLoadingInfo(false);
    }
  };

  const generateInvoice = async () => {
    setLoadingInvoice(true);
    try {
      const response = await fetch("/api/alby/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountSats: amount, description })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Invoice generation failed");
      }
      setInvoice(data.invoice);
      setPaymentHash(data.paymentHash);
      setInvoiceToPay(data.invoice);
      setStatus(`Invoice generated for ${data.amountSats} sats.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invoice generation failed");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const payInvoice = async () => {
    if (!invoiceToPay.trim()) return;
    setLoadingPay(true);
    try {
      const response = await fetch("/api/alby/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice: invoiceToPay.trim() })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Invoice payment failed");
      }
      setStatus(
        `Invoice paid successfully. Preimage: ${String(data.preimage).slice(0, 20)}...`
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invoice payment failed");
    } finally {
      setLoadingPay(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Alby L402 Setup</h1>
          <div className="flex items-center gap-2">
            <Link href="/marketplace" className="rounded-md border px-3 py-1.5 text-sm">
              Marketplace
            </Link>
            <Link href="/" className="rounded-md border px-3 py-1.5 text-sm">
              Home
            </Link>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 text-sm text-slate-700">
          <p className="font-medium">How auth/payment works (Alice/Bob model)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Alice configures an NWC connection (wallet auth) for invoice generation.</li>
            <li>Bob requests a protected URL through an L402 endpoint.</li>
            <li>Server returns HTTP 402 + invoice via `WWW-Authenticate`.</li>
            <li>After payment, request is retried with L402 auth proof and resource is unlocked.</li>
          </ol>
          <p className="mt-3">
            Test reference:{" "}
            <a
              href="https://sandbox.albylabs.com/#/simple-payment"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Alby Sandbox
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/getAlby/builder-skill"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              Alby Builder Skill
            </a>
            .
          </p>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Build 402 endpoint URL</p>

          <label className="mb-1 block text-xs text-slate-600">Protected URL</label>
          <input
            value={protectedUrl}
            onChange={(event) => setProtectedUrl(event.target.value)}
            className="mb-3 h-10 w-full rounded-md border px-3 text-sm"
          />

          <label className="mb-1 block text-xs text-slate-600">Price (sats)</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(event) => setAmount(Number(event.target.value))}
            className="mb-3 h-10 w-36 rounded-md border px-3 text-sm"
          />

          <label className="mb-1 block text-xs text-slate-600">NWC URL (from Alby)</label>
          <textarea
            value={nwcUrl}
            onChange={(event) => setNwcUrl(event.target.value)}
            placeholder="nostr+walletconnect://...."
            rows={4}
            className="w-full rounded-md border p-3 text-xs"
          />

          <p className="mt-3 text-xs font-medium text-slate-700">402 Endpoint URL</p>
          <div className="mt-1 rounded-md border bg-slate-50 p-2 text-xs break-all">
            {proxyUrl || "Fill protected URL + NWC URL to generate endpoint"}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <p className="mb-3 text-sm font-medium">Test wallet + invoices in this app</p>
          <div className="flex items-center gap-2">
            <button
              onClick={checkWallet}
              disabled={loadingInfo}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              {loadingInfo ? "Checking..." : "Check Wallet Connection"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Alias: {walletInfo.alias ?? "-"} | Balance:{" "}
            {typeof walletInfo.balanceSats === "number"
              ? `${walletInfo.balanceSats} sats`
              : "-"}
          </p>

          <div className="mt-4 grid gap-3">
            <div>
              <label className="mb-1 block text-xs text-slate-600">Invoice description</label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="h-10 w-full rounded-md border px-3 text-sm"
              />
            </div>
            <button
              onClick={generateInvoice}
              disabled={loadingInvoice}
              className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm text-white"
            >
              {loadingInvoice ? "Generating..." : "Generate Invoice"}
            </button>

            <div className="rounded-md border bg-slate-50 p-2 text-xs break-all">
              <p className="font-medium">Invoice</p>
              <p>{invoice || "-"}</p>
              <p className="mt-2 font-medium">Payment hash</p>
              <p>{paymentHash || "-"}</p>
            </div>

            <label className="mb-1 block text-xs text-slate-600">Pay invoice with same Alby wallet (sandbox)</label>
            <textarea
              value={invoiceToPay}
              onChange={(event) => setInvoiceToPay(event.target.value)}
              rows={3}
              className="w-full rounded-md border p-2 text-xs"
            />
            <button
              onClick={payInvoice}
              disabled={loadingPay || !invoiceToPay.trim()}
              className="w-fit rounded-md border px-4 py-2 text-sm"
            >
              {loadingPay ? "Paying..." : "Pay Invoice"}
            </button>
          </div>
        </div>

        <p className="rounded-md border bg-white p-3 text-sm">{status}</p>
      </div>
    </main>
  );
}
