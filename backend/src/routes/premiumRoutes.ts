import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { lightningWalletService } from "../services/lightningWalletService";
import {
  hashHex,
  parseL402Authorization,
  signMacaroonPayload,
  verifyMacaroonPayload,
  verifyPreimageAgainstPaymentHash
} from "../services/premiumMacaroonService";
import { queryUAgentDirect } from "../services/uagentDirectService";

const bodySchema = z.object({
  agentAddress: z.string().min(2),
  message: z.string().min(1),
  userId: z.string().optional(),
  agentverseToken: z.string().optional()
});

export const premiumRoutes = Router();

async function handlePremiumAgentQuery(req: Request, res: Response) {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", issues: parsed.error.issues });
  }

  const userSeed = parsed.data.userId?.trim() || "anonymous";
  const messageHash = hashHex(parsed.data.message);
  const authHeader = req.get("authorization") ?? undefined;
  const l402 = parseL402Authorization(authHeader);

  if (l402) {
    const payload = verifyMacaroonPayload(l402.token);
    if (!payload) {
      return res.status(401).json({ error: "invalid_macaroon" });
    }
    if (payload.expiresAt * 1000 < Date.now()) {
      return res.status(401).json({ error: "macaroon_expired" });
    }
    if (
      payload.agentAddress !== parsed.data.agentAddress ||
      payload.messageHash !== messageHash ||
      payload.userSeed !== userSeed
    ) {
      return res.status(401).json({ error: "macaroon_mismatch" });
    }
    if (!verifyPreimageAgainstPaymentHash(l402.preimage, payload.paymentHash)) {
      return res.status(402).json({ error: "invalid_payment", message: "preimage does not match invoice" });
    }

    const result = await queryUAgentDirect({
      agentAddress: parsed.data.agentAddress,
      message: parsed.data.message,
      userSeed,
      agentverseToken: parsed.data.agentverseToken
    });

    if (result.success) {
      return res.json({ success: true, response: result.response });
    }
    return res.status(502).json({
      success: false,
      error: result.error ?? "agent_query_failed",
      response: "Agent could not process this request right now."
    });
  }

  const amountSats = Math.max(1, Number(process.env.PREMIUM_AGENT_QUERY_PRICE_SATS ?? 1));
  const expirySeconds = Number(process.env.L402_EXPIRY_SECONDS ?? 300);

  try {
    const invoiceData = await lightningWalletService.createInvoice({
      amountSats,
      memo: `ShotenX premium query ${parsed.data.agentAddress.slice(0, 24)}`,
      expirySeconds
    });
    const paymentHash = invoiceData.paymentHash.toLowerCase();
    const macaroon = signMacaroonPayload({
      paymentHash,
      amountSats,
      expiresAt: invoiceData.expiresAt,
      agentAddress: parsed.data.agentAddress,
      userSeed,
      messageHash
    });

    res.status(402);
    // Invoice is only in JSON (BOLT11 can break quoted header values).
    res.setHeader("WWW-Authenticate", `L402 ${macaroon}`);
    return res.json({
      error: "payment_required",
      status: 402,
      macaroon,
      invoice: invoiceData.invoice,
      paymentHash,
      amountSats,
      expiresAt: invoiceData.expiresAt,
      scheme: "L402"
    });
  } catch (error) {
    return res.status(502).json({
      error: "invoice_generation_failed",
      message: error instanceof Error ? error.message : "Unable to create Lightning invoice"
    });
  }
}

premiumRoutes.post("/agent-query", handlePremiumAgentQuery);

premiumRoutes.post("/agent-query-auto", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", issues: parsed.error.issues });
  }

  const userSeed = parsed.data.userId?.trim() || "anonymous";
  const messageHash = hashHex(parsed.data.message);
  const amountSats = Math.max(1, Number(process.env.PREMIUM_AGENT_QUERY_PRICE_SATS ?? 1));
  const expirySeconds = Number(process.env.L402_EXPIRY_SECONDS ?? 300);

  try {
    const invoiceData = await lightningWalletService.createInvoice({
      amountSats,
      memo: `ShotenX premium auto ${parsed.data.agentAddress.slice(0, 24)}`,
      expirySeconds
    });
    const paymentHash = invoiceData.paymentHash.toLowerCase();
    const macaroon = signMacaroonPayload({
      paymentHash,
      amountSats,
      expiresAt: invoiceData.expiresAt,
      agentAddress: parsed.data.agentAddress,
      userSeed,
      messageHash
    });

    const { preimage } = await lightningWalletService.payInvoiceAsAgent(invoiceData.invoice);
    req.headers.authorization = `L402 ${macaroon}:${preimage}`;
    return handlePremiumAgentQuery(req, res);
  } catch (error) {
    return res.status(502).json({
      error: "premium_autopay_failed",
      message: error instanceof Error ? error.message : "Unable to pay premium invoice"
    });
  }
});
