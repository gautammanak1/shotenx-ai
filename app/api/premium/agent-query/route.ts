import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const toErrorMessage = (value: unknown, fallback: string) => {
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

const L402_SCHEME = "L402";
const expirySeconds = 900;
const priceSats = Number(process.env.ALBY_PRICE_SATS ?? 50);

const hashHex = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const base64UrlEncode = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

const getL402Secret = () => {
  const secret =
    process.env.ALBY_L402_SECRET?.trim() || process.env.MDK_ACCESS_TOKEN?.trim();
  // Dev fallback prevents hard 502 when frontend env misses secret.
  // For production, set ALBY_L402_SECRET or MDK_ACCESS_TOKEN.
  return secret || "shotenx-dev-l402-secret";
};

type TokenPayload = {
  paymentHash: string;
  amountSats: number;
  expiresAt: number;
  agentAddress: string;
  userSeed: string;
  messageHash: string;
};

const signPayload = (payload: TokenPayload) => {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", getL402Secret()).update(body).digest("hex");
  return `${base64UrlEncode(body)}.${sig}`;
};

const verifySignedPayload = (token: string): TokenPayload | null => {
  const [bodyB64, signature] = token.split(".");
  if (!bodyB64 || !signature) return null;

  const body = base64UrlDecode(bodyB64);
  const expectedSig = createHmac("sha256", getL402Secret()).update(body).digest("hex");

  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    return JSON.parse(body) as TokenPayload;
  } catch {
    return null;
  }
};

const parseL402Header = (headerValue: string | null) => {
  if (!headerValue) return null;
  if (!headerValue.startsWith(`${L402_SCHEME} `)) return null;

  const raw = headerValue.slice(`${L402_SCHEME} `.length).trim();
  const separator = raw.indexOf(":");
  if (separator <= 0) return null;

  return {
    token: raw.slice(0, separator),
    preimage: raw.slice(separator + 1)
  };
};

const getBackendBase = () => {
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!backendBase) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }
  return backendBase;
};

export const POST = async (req: Request) => {
  let payload: { agentAddress?: string; message?: string; userId?: string };
  try {
    payload = (await req.json()) as {
      agentAddress?: string;
      message?: string;
      userId?: string;
    };
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const agentAddress = payload.agentAddress?.trim();
  const message = payload.message?.trim();
  const userSeed = payload.userId?.trim() || "anonymous-user";
  const messageHash = hashHex(message ?? "");

  if (!agentAddress || !message) {
    return Response.json(
      { error: "agentAddress and message are required" },
      { status: 400 }
    );
  }

  const parsedAuth = parseL402Header(req.headers.get("authorization"));
  if (!parsedAuth) {
    try {
      const invoiceResponse = await fetch(`${getBackendBase()}/api/payments/wallet/invoice`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amountSats: Math.max(1, priceSats),
          description: `ShotenX paid agent query for ${agentAddress.slice(0, 18)}`
        })
      });
      const invoicePayload = (await invoiceResponse.json()) as {
        invoice?: string;
        paymentHash?: string;
        error?: string;
      };
      if (!invoiceResponse.ok || !invoicePayload.invoice || !invoicePayload.paymentHash) {
        throw new Error(invoicePayload.error ?? "invoice_generation_failed");
      }

      const tokenPayload: TokenPayload = {
        paymentHash: invoicePayload.paymentHash,
        amountSats: Math.max(1, priceSats),
        expiresAt: Math.floor(Date.now() / 1000) + expirySeconds,
        agentAddress,
        userSeed,
        messageHash
      };

      const macaroon = signPayload(tokenPayload);
      const challengeBody = {
        error: "payment_required",
        macaroon,
        invoice: invoicePayload.invoice,
        paymentHash: invoicePayload.paymentHash,
        amountSats: tokenPayload.amountSats,
        expiresAt: tokenPayload.expiresAt
      };

      return new Response(JSON.stringify(challengeBody), {
        status: 402,
        headers: {
          "content-type": "application/json",
          "www-authenticate": `${L402_SCHEME} macaroon="${macaroon}", invoice="${invoicePayload.invoice}"`
        }
      });
    } catch (error) {
      return Response.json(
        {
          error: toErrorMessage(error, "invoice_generation_failed")
        },
        { status: 502 }
      );
    }
  }

  const verified = verifySignedPayload(parsedAuth.token);
  if (!verified) {
    return Response.json({ error: "invalid_credential" }, { status: 401 });
  }

  if (verified.expiresAt < Math.floor(Date.now() / 1000)) {
    return Response.json({ error: "credential_expired" }, { status: 401 });
  }

  if (
    verified.agentAddress !== agentAddress ||
    verified.userSeed !== userSeed ||
    verified.messageHash !== messageHash
  ) {
    return Response.json({ error: "resource_mismatch" }, { status: 403 });
  }

  let preimageHash = "";
  try {
    preimageHash = createHash("sha256")
      .update(Buffer.from(parsedAuth.preimage, "hex"))
      .digest("hex");
  } catch {
    return Response.json({ error: "invalid_payment_proof" }, { status: 401 });
  }
  if (preimageHash !== verified.paymentHash) {
    return Response.json({ error: "invalid_payment_proof" }, { status: 401 });
  }

  try {
    const directChatEndpoint = new URL("/api/agent-chat", req.url).toString();
    const directResponse = await fetch(directChatEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agentAddress,
        message,
        userSeed
      })
    });

    const directPayload = (await directResponse.json()) as Record<string, unknown>;
    if (!directResponse.ok || !directPayload.success) {
      return Response.json(
        {
          error: toErrorMessage(
            directPayload.error,
            "agent_query_failed"
          )
        },
        { status: 502 }
      );
    }

    return Response.json(
      {
        success: true,
        response: String(directPayload.response ?? "")
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        error: toErrorMessage(error, "agent_runtime_error")
      },
      { status: 502 }
    );
  }
};
