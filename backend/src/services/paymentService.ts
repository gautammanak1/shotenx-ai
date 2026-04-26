import { createHash } from "node:crypto";
import { v4 as uuid } from "uuid";
import { CheckoutSession } from "../types";
import { lightningWalletService } from "./lightningWalletService";
import { paymentStore } from "./paymentStore";

const INVOICE_EXPIRY_SECONDS = Number(process.env.L402_EXPIRY_SECONDS ?? 300);
const PAID_CACHE_MS = Number(process.env.L402_PAID_CACHE_MS ?? 10 * 60 * 1000);
const paidSessionCache = new Map<string, number>();

const nowIso = () => new Date().toISOString();

const isExpired = (session: CheckoutSession) =>
  new Date(session.expiresAt).getTime() <= Date.now();

const hashPreimage = (preimage: string) =>
  createHash("sha256").update(Buffer.from(preimage, "hex")).digest("hex");

const toCheckoutResponse = (session: CheckoutSession) => ({
  ...session,
  providerMode: lightningWalletService.isConfigured() ? "alby-nwc" : "not-configured"
});

export const paymentService = {
  async createCheckout(params: {
    agentId: string;
    buyerId: string;
    amountSats: number;
    requestPath?: string;
    requestMethod?: string;
  }) {
    const id = uuid();
    const invoiceData = await lightningWalletService.createInvoice({
      amountSats: params.amountSats,
      memo: `ShotenX paid call for ${params.agentId}`,
      expirySeconds: INVOICE_EXPIRY_SECONDS
    });

    const session: CheckoutSession = {
      id,
      agentId: params.agentId,
      buyerId: params.buyerId,
      amountSats: params.amountSats,
      invoice: invoiceData.invoice,
      paymentHash: invoiceData.paymentHash,
      status: "pending",
      createdAt: nowIso(),
      expiresAt: new Date(invoiceData.expiresAt * 1000).toISOString(),
      requestPath: params.requestPath,
      requestMethod: params.requestMethod
    };

    paymentStore.upsertSession(session);
    paymentStore.addLog({
      checkoutId: id,
      requestPath: params.requestPath ?? "/unknown",
      requestMethod: params.requestMethod ?? "POST",
      amountSats: params.amountSats,
      status: "pending",
      event: "challenge_issued",
      timestamp: nowIso()
    });

    return toCheckoutResponse(session);
  },

  getSession(sessionId: string) {
    const session = paymentStore.getSession(sessionId);
    if (!session) return undefined;

    if (session.status === "pending" && isExpired(session)) {
      const updated: CheckoutSession = {
        ...session,
        status: "expired"
      };
      paymentStore.upsertSession(updated);
      paymentStore.addLog({
        checkoutId: session.id,
        requestPath: session.requestPath ?? "/unknown",
        requestMethod: session.requestMethod ?? "POST",
        amountSats: session.amountSats,
        status: "expired",
        event: "expired",
        timestamp: nowIso()
      });
      return updated;
    }

    return session;
  },

  async verifyAndSettle(params: {
    checkoutId: string;
    preimage: string;
    requestPath?: string;
    requestMethod?: string;
  }) {
    const session = this.getSession(params.checkoutId);
    if (!session) {
      return { ok: false as const, reason: "not_found" as const };
    }

    if (session.status === "consumed") {
      return { ok: false as const, reason: "already_consumed" as const };
    }

    if (session.status === "expired" || isExpired(session)) {
      return { ok: false as const, reason: "expired" as const };
    }

    paymentStore.addLog({
      checkoutId: session.id,
      requestPath: params.requestPath ?? session.requestPath ?? "/unknown",
      requestMethod: params.requestMethod ?? session.requestMethod ?? "POST",
      amountSats: session.amountSats,
      status: session.status,
      event: "verify_attempt",
      timestamp: nowIso()
    });

    let computedHash: string;
    try {
      computedHash = hashPreimage(params.preimage);
    } catch {
      return { ok: false as const, reason: "invalid_preimage" as const };
    }

    if (computedHash !== session.paymentHash) {
      const failed: CheckoutSession = {
        ...session,
        status: "failed",
        failureReason: "invalid_preimage"
      };
      paymentStore.upsertSession(failed);
      paymentStore.addLog({
        checkoutId: session.id,
        requestPath: params.requestPath ?? session.requestPath ?? "/unknown",
        requestMethod: params.requestMethod ?? session.requestMethod ?? "POST",
        amountSats: session.amountSats,
        status: "failed",
        event: "failed",
        timestamp: nowIso(),
        detail: "Payment preimage hash mismatch"
      });
      return { ok: false as const, reason: "invalid_preimage" as const };
    }

    const hashOk = paymentStore.markHashUsed(session.paymentHash, session.id);
    if (!hashOk) {
      paymentStore.addLog({
        checkoutId: session.id,
        requestPath: params.requestPath ?? session.requestPath ?? "/unknown",
        requestMethod: params.requestMethod ?? session.requestMethod ?? "POST",
        amountSats: session.amountSats,
        status: "failed",
        event: "reused_hash_rejected",
        timestamp: nowIso(),
        detail: "Payment hash already used by another checkout"
      });
      return { ok: false as const, reason: "hash_reused" as const };
    }

    const settled: CheckoutSession = {
      ...session,
      status: "settled",
      settledAt: nowIso()
    };
    paymentStore.upsertSession(settled);
    paidSessionCache.set(settled.id, Date.now() + PAID_CACHE_MS);
    paymentStore.addLog({
      checkoutId: settled.id,
      requestPath: params.requestPath ?? settled.requestPath ?? "/unknown",
      requestMethod: params.requestMethod ?? settled.requestMethod ?? "POST",
      amountSats: settled.amountSats,
      status: "settled",
      event: "verified",
      timestamp: nowIso()
    });

    return { ok: true as const, session: settled };
  },

  consumeSession(sessionId: string, requestPath?: string, requestMethod?: string) {
    const session = this.getSession(sessionId);
    if (!session || session.status !== "settled") {
      return undefined;
    }

    const consumed: CheckoutSession = {
      ...session,
      status: "consumed",
      consumedAt: nowIso()
    };
    paymentStore.upsertSession(consumed);
    paymentStore.addLog({
      checkoutId: consumed.id,
      requestPath: requestPath ?? consumed.requestPath ?? "/unknown",
      requestMethod: requestMethod ?? consumed.requestMethod ?? "POST",
      amountSats: consumed.amountSats,
      status: "consumed",
      event: "consumed",
      timestamp: nowIso()
    });
    return consumed;
  },

  isSettled(sessionId?: string) {
    if (!sessionId) return false;

    const cacheExpiry = paidSessionCache.get(sessionId);
    if (cacheExpiry && cacheExpiry > Date.now()) {
      return true;
    }
    if (cacheExpiry && cacheExpiry <= Date.now()) {
      paidSessionCache.delete(sessionId);
    }

    const session = this.getSession(sessionId);
    if (!session) return false;
    return session.status === "settled";
  },

  getLogs(limit = 200) {
    return paymentStore.listLogs(limit);
  },

  async simulateAgentPayment(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return { ok: false as const, reason: "not_found" as const };
    if (session.status === "expired") return { ok: false as const, reason: "expired" as const };

    const payment = await lightningWalletService.payInvoiceAsAgent(session.invoice);
    paymentStore.addLog({
      checkoutId: session.id,
      requestPath: session.requestPath ?? "/unknown",
      requestMethod: session.requestMethod ?? "POST",
      amountSats: session.amountSats,
      status: session.status,
      event: "agent_autopay",
      timestamp: nowIso()
    });

    const verified = await this.verifyAndSettle({
      checkoutId: session.id,
      preimage: payment.preimage,
      requestPath: session.requestPath,
      requestMethod: session.requestMethod
    });

    if (!verified.ok) {
      return verified;
    }

    return {
      ok: true as const,
      preimage: payment.preimage,
      session: verified.session
    };
  },

  /** After a settled checkout, consume it when the client proves the same preimage (e.g. agent-chat). */
  finalizePaidCall(params: {
    checkoutId: string;
    preimage: string;
    consumePath?: string;
    consumeMethod?: string;
  }) {
    const session = this.getSession(params.checkoutId);
    if (!session) {
      return { ok: false as const, reason: "not_found" as const };
    }
    if (session.status === "consumed") {
      return { ok: false as const, reason: "already_consumed" as const };
    }
    if (session.status !== "settled") {
      return { ok: false as const, reason: "not_settled" as const };
    }
    let computedHash: string;
    try {
      computedHash = hashPreimage(params.preimage);
    } catch {
      return { ok: false as const, reason: "invalid_preimage" as const };
    }
    if (computedHash !== session.paymentHash) {
      return { ok: false as const, reason: "invalid_preimage" as const };
    }
    this.consumeSession(
      params.checkoutId,
      params.consumePath ?? "/next/agent-chat",
      params.consumeMethod ?? "POST"
    );
    return { ok: true as const };
  }
};
