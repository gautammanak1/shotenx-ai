import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/alby/balance — backend NWC wallet info. Always 200 so UI never hard-fails if backend is down or misconfigured. */
export async function GET() {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!backendBase) {
    return NextResponse.json({
      ok: true,
      balanceSats: 0,
      alias: "",
      mode: "unavailable",
      warning: "NEXT_PUBLIC_BACKEND_URL is not configured",
    });
  }

  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 12_000);
    const response = await fetch(`${backendBase}/api/payments/wallet/info`, {
      cache: "no-store",
      signal: ac.signal,
    });
    clearTimeout(t);
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return NextResponse.json({
        ok: true,
        balanceSats: 0,
        alias: "",
        mode: "unavailable",
        warning: String(payload.error ?? payload.message ?? `wallet_http_${response.status}`),
      });
    }

    return NextResponse.json({
      ok: true,
      balanceSats: payload.balanceSats ?? 0,
      alias: payload.alias ?? "",
      mode: payload.mode === "alby-nwc" ? "alby-nwc" : "test",
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      balanceSats: 0,
      alias: "",
      mode: "unavailable",
      warning: error instanceof Error ? error.message : "balance_fetch_failed",
    });
  }
}
