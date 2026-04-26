import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** GET /api/alby/balance — same data as /api/alby/info (wallet balance via backend NWC). */
export async function GET() {
  try {
    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!backendBase) {
      throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
    }
    const response = await fetch(`${backendBase}/api/payments/wallet/info`, {
      cache: "no-store"
    });
    const payload = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(String(payload.error ?? "balance_fetch_failed"));
    }

    return NextResponse.json({
      ok: true,
      balanceSats: payload.balanceSats ?? 0,
      alias: payload.alias ?? "",
      mode: payload.mode ?? "test"
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "balance_fetch_failed"
      },
      { status: 500 }
    );
  }
}
