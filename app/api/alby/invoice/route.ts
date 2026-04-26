import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      amountSats?: number;
      description?: string;
    };

    const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!backendBase) {
      throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
    }
    const response = await fetch(`${backendBase}/api/payments/wallet/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountSats: Math.max(1, Number(payload.amountSats ?? 1)),
        description: payload.description?.trim() || "ShotenX invoice"
      })
    });
    const result = (await response.json()) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(String(result.error ?? "invoice_generation_failed"));
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "invoice_generation_failed"
      },
      { status: 500 }
    );
  }
}
