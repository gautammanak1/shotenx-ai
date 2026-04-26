import { NWCClient } from "@getalby/sdk";

const getNwcUrl = (kind: "merchant" | "agent") => {
  if (kind === "agent") {
    return process.env.AGENT_NWC_URL?.trim() || process.env.ALBY_NWC_URL?.trim();
  }
  return process.env.ALBY_NWC_URL?.trim();
};

const clientCache = new Map<string, NWCClient>();

const getClient = (kind: "merchant" | "agent") => {
  const nwcUrl = getNwcUrl(kind);
  if (!nwcUrl) {
    throw new Error(
      kind === "agent"
        ? "AGENT_NWC_URL (or ALBY_NWC_URL) is not configured"
        : "ALBY_NWC_URL is not configured"
    );
  }

  const key = `${kind}:${nwcUrl}`;
  const existing = clientCache.get(key);
  if (existing) return existing;

  const next = new NWCClient({ nostrWalletConnectUrl: nwcUrl });
  clientCache.set(key, next);
  return next;
};

export const lightningWalletService = {
  isConfigured() {
    return Boolean(getNwcUrl("merchant"));
  },

  async getWalletInfo() {
    const client = getClient("merchant");
    const [info, balance] = await Promise.all([client.getInfo(), client.getBalance()]);
    return {
      alias: info.alias,
      pubkey: info.pubkey,
      balanceSats: Math.floor((balance.balance ?? 0) / 1000)
    };
  },

  async createInvoice(params: {
    amountSats: number;
    memo: string;
    expirySeconds: number;
  }) {
    const client = getClient("merchant");
    const response = (await client.makeInvoice({
      amount: params.amountSats * 1000,
      description: params.memo,
      expiry: params.expirySeconds
    })) as Record<string, unknown>;

    const invoice =
      (typeof response.invoice === "string" && response.invoice) ||
      (typeof response.payment_request === "string" && response.payment_request);
    const paymentHash =
      (typeof response.payment_hash === "string" && response.payment_hash) ||
      (typeof response.paymentHash === "string" && response.paymentHash);
    const expiresAt =
      (typeof response.expires_at === "number" && response.expires_at > 0
        ? response.expires_at
        : Math.floor(Date.now() / 1000) + params.expirySeconds);

    if (!invoice || !paymentHash) {
      throw new Error("Wallet invoice response missing payment request/hash");
    }

    return {
      invoice,
      paymentHash,
      expiresAt
    };
  },

  async payInvoiceAsAgent(invoice: string) {
    const client = getClient("agent");
    const response = (await client.payInvoice({ invoice })) as Record<string, unknown>;
    const preimage =
      (typeof response.preimage === "string" && response.preimage) ||
      (typeof response.payment_preimage === "string" && response.payment_preimage);

    if (!preimage) {
      throw new Error("Agent wallet payment response did not include preimage");
    }

    return {
      preimage,
      raw: response
    };
  }
};
