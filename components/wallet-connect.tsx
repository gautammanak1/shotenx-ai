"use client";

import { useEffect, useState } from "react";

export function WalletConnect() {
  const [connected, setConnected] = useState(false);
  const [ready, setReady] = useState(false);
  const [balanceSats, setBalanceSats] = useState<number | null>(null);
  const [launch, setLaunch] = useState<null | (() => void)>(null);
  const [disconnectWallet, setDisconnectWallet] = useState<null | (() => void)>(null);

  useEffect(() => {
    let offConnected: (() => void) | undefined;
    let offDisconnected: (() => void) | undefined;

    const boot = async () => {
      const mod = await import("@getalby/bitcoin-connect");
      mod.init({
        appName: "ShotenX AI",
        showBalance: true,
        filters: ["nwc"]
      });
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

  const handleClick = () => {
    if (!ready) return;
    if (connected && disconnectWallet) {
      disconnectWallet();
      return;
    }
    launch?.();
  };

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={!ready}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
      >
        {!ready ? "Loading Wallet..." : connected ? "Wallet Connected" : "Connect Wallet"}
      </button>
      {connected && balanceSats !== null && (
        <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
          {balanceSats} sats
        </span>
      )}
    </div>
  );
}

