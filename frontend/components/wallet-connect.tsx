"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ensureBitcoinConnectInit } from "@/lib/bitcoin-connect-init";

export function WalletConnect({ compact }: { compact?: boolean }) {
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const [backendMode, setBackendMode] = useState<"test" | "alby-nwc" | "unavailable" | null>(null);
  const [backendBalance, setBackendBalance] = useState<number | null>(null);
  const [launch, setLaunch] = useState<null | (() => void)>(null);
  const [disconnectWallet, setDisconnectWallet] = useState<null | (() => void)>(null);

  useEffect(() => {
    let offConnected: (() => void) | undefined;
    let offDisconnected: (() => void) | undefined;

    const boot = async () => {
      const mod = await ensureBitcoinConnectInit();
      offConnected = mod.onConnected(async (provider) => {
        setConnected(true);
        try {
          const balance = await provider.getBalance();
          setBalanceSats(Number(balance?.balance ?? 0));
        } catch {
          setBalanceSats(null);
        }
      });
      offDisconnected = mod.onDisconnected(() => {
        setConnected(false);
        setBalanceSats(null);
      });
      setLaunch(() => mod.launchModal);
      setDisconnectWallet(() => mod.disconnect);
      setReady(true);
    };

    void boot();
    return () => {
      offConnected?.();
      offDisconnected?.();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const info = await api.getWalletInfo();
        if (!alive) return;
        setBackendMode(info.mode);
        setBackendBalance(info.balanceSats);
      } catch {
        if (!alive) return;
        setBackendMode("unavailable");
        setBackendBalance(null);
      }
    };
    void refresh();
    const id = setInterval(() => void refresh(), 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const handleClick = () => {
    if (!ready) return;
    if (connected && disconnectWallet) {
      disconnectWallet();
      return;
    }
    launch?.();
  };

  const modeBadge =
    backendMode === "test"
      ? { label: "Test Mode", className: "border-yellow-400/40 bg-yellow-500/10 text-yellow-600" }
      : backendMode === "alby-nwc"
        ? { label: "Live Sats", className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-600" }
        : backendMode === "unavailable"
          ? { label: "Backend wallet", className: "border-[#333333] bg-[#111111] text-[#666666]" }
          : null;

  const walletLabel = !ready
    ? compact
      ? "…"
      : "Loading Wallet..."
    : connected
      ? compact
        ? "Connected"
        : "Wallet Connected"
      : compact
        ? "Wallet"
        : "Connect Wallet";

  return (
    <div className="inline-flex max-w-full flex-wrap items-center justify-end gap-1 sm:gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready}
        className="rounded-md border border-border bg-card px-2 py-1.5 text-xs hover:bg-muted sm:px-3 sm:text-sm"
      >
        {walletLabel}
      </button>
      {connected && balanceSats !== null && !compact && (
        <span className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
          {balanceSats} sats
        </span>
      )}
      {modeBadge && !compact && (
        <span
          title={
            backendMode === "test"
              ? "Backend wallet is in test mode (mock invoices, real L402 verification)."
              : backendMode === "alby-nwc"
                ? "Backend wallet is connected to real Lightning via Alby NWC."
                : "Could not reach backend wallet info (check NEXT_PUBLIC_BACKEND_URL and API)."
          }
          className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${modeBadge.className}`}
        >
          {modeBadge.label}
          {backendBalance !== null && backendMode === "test" && (
            <span className="ml-1 font-mono opacity-80">· {backendBalance}s</span>
          )}
        </span>
      )}
    </div>
  );
}

