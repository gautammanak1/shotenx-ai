"use client";

/**
 * Single init for @getalby/bitcoin-connect.
 * - autoConnect: false — avoids reconnecting to NWC / relay on every page load.
 * - showBalance: false — skips get_info/get_balance to relay until user pays (less noise if relay is blocked).
 * Network/VPN/firewall can still block wss://relay.getalby.com; users can paste preimage or use another network.
 */
type BitcoinConnectMod = typeof import("@getalby/bitcoin-connect");

let ready: Promise<BitcoinConnectMod> | null = null;

export function ensureBitcoinConnectInit(): Promise<BitcoinConnectMod> {
  if (!ready) {
    ready = import("@getalby/bitcoin-connect").then((mod) => {
      mod.init({
        appName: "ShotenX AI",
        filters: ["nwc"],
        showBalance: false,
        autoConnect: false,
      });
      return mod;
    });
  }
  return ready;
}
