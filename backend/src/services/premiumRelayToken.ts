import { createHmac, timingSafeEqual } from "node:crypto";

/** Same string both sides: premium proxy sets it, agent-chat reads it (HTTP lowercases). */
export const SHOTENX_PREMIUM_RELAY_HEADER = "x-shotenx-premium-relay";

export type PremiumRelayPayload = {
  agentAddress: string;
  message: string;
  userSeed: string;
  exp: number;
};

const relaySecret = () =>
  process.env.SHOTENX_PREMIUM_RELAY_SECRET?.trim() ||
  process.env.ALBY_L402_SECRET?.trim() ||
  process.env.MDK_ACCESS_TOKEN?.trim() ||
  "shotenx-dev-l402-secret";

export function signPremiumRelayToken(payload: PremiumRelayPayload): string {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", relaySecret()).update(body).digest("hex");
  return Buffer.from(JSON.stringify({ p: payload, sig }), "utf8").toString("base64url");
}

export function verifyPremiumRelayToken(token: string): PremiumRelayPayload | null {
  try {
    const raw = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as {
      p?: PremiumRelayPayload;
      sig?: string;
    };
    if (!raw.p || !raw.sig) return null;
    const body = JSON.stringify(raw.p);
    const expected = createHmac("sha256", relaySecret()).update(body).digest("hex");
    const a = Buffer.from(raw.sig, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    if (raw.p.exp < Math.floor(Date.now() / 1000)) return null;
    return raw.p;
  } catch {
    return null;
  }
}

export function relayMatchesRequest(
  relay: PremiumRelayPayload,
  agentAddress: string,
  message: string,
  userSeed: string
): boolean {
  return relay.agentAddress === agentAddress && relay.message === message && relay.userSeed === userSeed;
}
