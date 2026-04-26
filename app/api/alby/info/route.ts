import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
      throw new Error(String(payload.error ?? "alby_info_failed"));
    }

    return NextResponse.json({
      ...payload
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "alby_info_failed"
      },
      { status: 500 }
    );
  }
}
