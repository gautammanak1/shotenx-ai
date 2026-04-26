import { Router } from "express";
import { z } from "zod";
import { paymentService } from "../services/paymentService";
import {
  relayMatchesRequest,
  SHOTENX_PREMIUM_RELAY_HEADER,
  verifyPremiumRelayToken
} from "../services/premiumRelayToken";
import { queryUAgentDirect, normalizeAgentError } from "../services/uagentDirectService";

const chatBodySchema = z.object({
  agentAddress: z.string().min(2),
  message: z.string().min(1),
  userSeed: z.string().min(2).default("anonymous"),
  agentverseToken: z.string().optional(),
  checkoutId: z.string().optional(),
  preimage: z.string().optional()
});

export const agentverseChatRoutes = Router();

agentverseChatRoutes.post("/agent-chat", async (req, res) => {
  const parsed = chatBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_payload", issues: parsed.error.issues });
  }

  const relayHeader = req.get(SHOTENX_PREMIUM_RELAY_HEADER);
  if (relayHeader) {
    const relay = verifyPremiumRelayToken(relayHeader);
    if (
      !relay ||
      !relayMatchesRequest(relay, parsed.data.agentAddress, parsed.data.message, parsed.data.userSeed)
    ) {
      return res.status(401).json({ error: "invalid_relay", message: "Premium relay token invalid or expired." });
    }

    try {
      const result = await queryUAgentDirect({
        agentAddress: parsed.data.agentAddress,
        message: parsed.data.message,
        userSeed: parsed.data.userSeed,
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
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: normalizeAgentError(error, "unknown_error"),
        response: "An error occurred while processing your request."
      });
    }
  }

  const relayAgentId = process.env.AGENTVERSE_CHAT_AGENT_ID?.trim() || "shotenx-agentverse-chat";
  const chatPriceSats = Math.max(1, Number(process.env.AGENTVERSE_CHAT_PRICE_SATS ?? 1));
  const { checkoutId, preimage, userSeed, agentAddress, message, agentverseToken } = parsed.data;

  if (checkoutId && !preimage) {
    const existing = paymentService.getSession(checkoutId);
    if (!existing) {
      return res.status(404).json({ error: "checkout_not_found" });
    }
    return res.status(400).json({
      error: "preimage_required",
      message: "Pay the invoice, POST /api/payments/:checkoutId/verify, then retry with checkoutId and preimage.",
      checkoutStatus: existing.status
    });
  }

  if (!checkoutId || !preimage) {
    try {
      const checkout = await paymentService.createCheckout({
        agentId: relayAgentId,
        buyerId: userSeed,
        amountSats: chatPriceSats,
        requestPath: "/api/agent-chat",
        requestMethod: "POST"
      });
      res.setHeader(
        "WWW-Authenticate",
        `L402 token="${checkout.id}", invoice="${checkout.invoice}", amount=${checkout.amountSats}`
      );
      return res.status(402).json({
        type: "https://docs.shotenx.ai/errors/payment-required",
        title: "Payment Required",
        status: 402,
        detail:
          "Pay the Lightning invoice, POST /api/payments/:id/verify with preimage, then retry with checkoutId and preimage.",
        l402: {
          version: "1.0",
          scheme: "L402",
          checkoutId: checkout.id,
          amountSats: checkout.amountSats,
          paymentHash: checkout.paymentHash,
          paymentRequest: checkout.invoice,
          expiresAt: checkout.expiresAt,
          verifyEndpoint: `/api/payments/${checkout.id}/verify`,
          finalizeEndpoint: `/api/payments/${checkout.id}/finalize-paid-call`
        }
      });
    } catch (error) {
      return res.status(502).json({
        error: "invoice_generation_failed",
        message: error instanceof Error ? error.message : "Unable to create checkout"
      });
    }
  }

  const session = paymentService.getSession(checkoutId);
  if (!session) {
    return res.status(404).json({ error: "checkout_not_found" });
  }

  if (session.status === "pending") {
    const verified = await paymentService.verifyAndSettle({
      checkoutId,
      preimage,
      requestPath: "/api/agent-chat",
      requestMethod: "POST"
    });
    if (!verified.ok) {
      if (verified.reason === "not_found") return res.status(404).json({ error: "checkout_not_found" });
      if (verified.reason === "expired") return res.status(410).json({ error: "checkout_expired" });
      if (verified.reason === "hash_reused") return res.status(409).json({ error: "payment_hash_reused" });
      if (verified.reason === "already_consumed") {
        return res.status(409).json({ error: "checkout_already_consumed" });
      }
      return res.status(401).json({ error: "invalid_preimage" });
    }
  }

  const finalized = paymentService.finalizePaidCall({
    checkoutId,
    preimage,
    consumePath: "/api/agent-chat",
    consumeMethod: "POST"
  });
  if (!finalized.ok) {
    if (finalized.reason === "not_found") return res.status(404).json({ error: "checkout_not_found" });
    if (finalized.reason === "already_consumed") {
      return res.status(409).json({ error: "checkout_already_consumed" });
    }
    if (finalized.reason === "not_settled") {
      return res.status(400).json({ error: "checkout_not_settled", message: "Verify payment before finalize." });
    }
    return res.status(401).json({ error: "invalid_preimage" });
  }

  try {
    const result = await queryUAgentDirect({
      agentAddress,
      message,
      userSeed,
      agentverseToken
    });
    if (result.success) {
      return res.json({ success: true, response: result.response, checkoutId });
    }
    return res.status(502).json({
      success: false,
      error: result.error ?? "agent_query_failed",
      response: "Agent could not process this request right now."
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: normalizeAgentError(error, "unknown_error"),
      response: "An error occurred while processing your request."
    });
  }
});
