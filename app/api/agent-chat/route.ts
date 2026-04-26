import { NextRequest, NextResponse } from "next/server";
import {
  relayMatchesRequest,
  SHOTENX_PREMIUM_RELAY_HEADER,
  verifyPremiumRelayToken,
} from "../_lib/premiumRelayToken";

export const runtime = "nodejs";

type UAgentClientInstance = {
  createUserBridge: (seed: string, token?: string) => Promise<unknown>;
  query: (
    agentAddress: string,
    query: string
  ) => Promise<{ success: boolean; response?: string; error?: unknown }>;
};

const clientInstances = new Map<string, UAgentClientInstance>();

const normalizeError = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error.trim()) {
      return record.error;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const AGENTVERSE_CHAT_AGENT_ID = "agentverse-uagent";
const chatPriceSats = () => Math.max(1, Number(process.env.AGENTVERSE_CHAT_L402_SATS ?? 25));

const parseL402Auth = (headerValue: string | null) => {
  if (!headerValue?.trim() || !headerValue.startsWith("L402 ")) return null;
  const raw = headerValue.slice(5).trim();
  const split = raw.indexOf(":");
  if (split <= 0) return null;
  return { checkoutId: raw.slice(0, split).trim(), preimage: raw.slice(split + 1).trim() };
};

const backendBase = () => {
  const b = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!b) throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  return b;
};

async function getClient(seed: string, token: string) {
  if (!clientInstances.has(seed)) {
    const UAgentClientModule = await import("uagent-client");
    const UAgentClient = UAgentClientModule.default || UAgentClientModule;

    const bridgePort = Number(process.env.UAGENT_BRIDGE_PORT ?? 8000);
    const config: {
      timeout: number;
      autoStartBridge: boolean;
      userSeed: string;
      agentverseToken: string;
      bridgePort?: number;
    } = {
      timeout: 60000,
      autoStartBridge: true,
      userSeed: seed,
      agentverseToken: token
    };

    if (Number.isFinite(bridgePort) && bridgePort > 0) {
      config.bridgePort = bridgePort;
    }

    const client = new (UAgentClient as unknown as new (c: typeof config) => UAgentClientInstance)(config);
    if (token) {
      await client.createUserBridge(seed, token);
    }
    clientInstances.set(seed, client);
  }

  return clientInstances.get(seed)!;
}

async function issueChallenge(buyerId: string) {
  const base = backendBase();
  const res = await fetch(`${base}/api/payments/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: AGENTVERSE_CHAT_AGENT_ID,
      buyerId,
      amountSats: chatPriceSats(),
      requestPath: "/api/agent-chat",
      requestMethod: "POST"
    })
  });
  const checkout = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return NextResponse.json(
      { error: normalizeError(checkout.error ?? checkout.message, "checkout_failed") },
      { status: 502 }
    );
  }

  const id = String(checkout.id ?? "");
  const invoice = String(checkout.invoice ?? "");
  const amountSats = Number(checkout.amountSats ?? chatPriceSats());
  const paymentHash = String(checkout.paymentHash ?? "");
  const expiresAt = String(checkout.expiresAt ?? "");

  const challenge = {
    type: "https://docs.lightning.engineering/the-lightning-network/l402",
    title: "Payment Required",
    status: 402,
    detail: "Pay the Lightning invoice, then retry with Authorization: L402 <checkoutId>:<preimage>.",
    l402: {
      version: "1.0",
      scheme: "L402",
      checkoutId: id,
      amountSats,
      paymentHash,
      paymentRequest: invoice,
      expiresAt,
      verifyEndpoint: `${base}/api/payments/${id}/verify`,
      finalizeEndpoint: `${base}/api/payments/${id}/finalize-paid-call`
    }
  };

  return new NextResponse(JSON.stringify(challenge), {
    status: 402,
    headers: {
      "content-type": "application/json",
      "www-authenticate": `L402 token="${id}", invoice="${invoice}", amount=${amountSats}`
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      message?: string;
      agentAddress?: string;
      userSeed?: string;
      agentverseToken?: string;
    };

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const agentAddress = typeof body.agentAddress === "string" ? body.agentAddress.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    if (!agentAddress) {
      return NextResponse.json({ error: "Invalid agentAddress" }, { status: 400 });
    }

    const seed = body.userSeed || process.env.UAGENT_DEFAULT_SEED || "frontend";
    const token = body.agentverseToken || process.env.AGENTVERSE_TOKEN || "";
    const base = backendBase();

    const relayHeader = request.headers.get(SHOTENX_PREMIUM_RELAY_HEADER);
    const relay = relayHeader ? verifyPremiumRelayToken(relayHeader) : null;
    if (relay && relayMatchesRequest(relay, agentAddress, message, seed)) {
      try {
        const client = await getClient(seed, token);
        const result = await client.query(agentAddress, message);
        if (result.success) {
          return NextResponse.json({
            response: result.response,
            success: true,
            payment: { status: "premium_relay", note: "Agentverse query after Alby premium macaroon verification." },
          });
        }
        return NextResponse.json(
          {
            success: false,
            error: normalizeError(result.error, "agent_query_failed"),
          },
          { status: 502 }
        );
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: normalizeError(error, "agent_runtime_error"),
          },
          { status: 500 }
        );
      }
    }

    const auth = parseL402Auth(request.headers.get("authorization"));

    if (!auth) {
      return issueChallenge(seed);
    }

    const verifyRes = await fetch(`${base}/api/payments/${encodeURIComponent(auth.checkoutId)}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preimage: auth.preimage })
    });
    const verifyPayload = (await verifyRes.json()) as Record<string, unknown>;
    if (!verifyRes.ok) {
      return NextResponse.json(
        {
          success: false,
          error: normalizeError(verifyPayload.error ?? verifyPayload.message, "payment_verify_failed")
        },
        { status: verifyRes.status === 404 ? 404 : 401 }
      );
    }

    const client = await getClient(seed, token);
    const result = await client.query(agentAddress, message);

    const finalizeRes = await fetch(
      `${base}/api/payments/${encodeURIComponent(auth.checkoutId)}/finalize-paid-call`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preimage: auth.preimage })
      }
    );
    if (!finalizeRes.ok) {
      const fin = (await finalizeRes.json().catch(() => ({}))) as Record<string, unknown>;
      return NextResponse.json(
        {
          success: false,
          response: result.success ? result.response : undefined,
          error: normalizeError(fin.error, "finalize_failed"),
          warning: "Agent responded but checkout consumption failed; do not reuse this preimage."
        },
        { status: 502 }
      );
    }

    if (result.success) {
      return NextResponse.json({
        response: result.response,
        success: true,
        payment: { checkoutId: auth.checkoutId, amountSats: chatPriceSats(), status: "consumed" }
      });
    }

    return NextResponse.json(
      {
        response: "Agent could not process this request right now.",
        success: false,
        error: normalizeError(result.error, "agent_query_failed")
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        response: "An error occurred while processing your request.",
        error: normalizeError(error, "Unknown error")
      },
      { status: 500 }
    );
  }
}
