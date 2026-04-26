import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const L402_SCHEME = "L402";

export type PremiumMacaroonPayload = {
  paymentHash: string;
  amountSats: number;
  expiresAt: number;
  agentAddress: string;
  userSeed: string;
  messageHash: string;
};

export const hashHex = (value: string) => createHash("sha256").update(value).digest("hex");

const base64UrlEncode = (value: string) => Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

export const getL402Secret = () => {
  const secret =
    process.env.ALBY_L402_SECRET?.trim() ||
    process.env.MDK_ACCESS_TOKEN?.trim() ||
    "shotenx-dev-l402-secret";
  return secret;
};

export const signMacaroonPayload = (payload: PremiumMacaroonPayload) => {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", getL402Secret()).update(body).digest("hex");
  return `${base64UrlEncode(body)}.${sig}`;
};

export const verifyMacaroonPayload = (token: string): PremiumMacaroonPayload | null => {
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
    return JSON.parse(body) as PremiumMacaroonPayload;
  } catch {
    return null;
  }
};

export const parseL402Authorization = (headerValue: string | undefined) => {
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

export const verifyPreimageAgainstPaymentHash = (preimage: string, paymentHash: string) => {
  try {
    const preimageHash = createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");
    return preimageHash.toLowerCase() === paymentHash.toLowerCase();
  } catch {
    return false;
  }
};
