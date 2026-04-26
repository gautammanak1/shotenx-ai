import { Router } from "express";
import { z } from "zod";
import { paymentService } from "../services/paymentService";
import { lightningWalletService } from "../services/lightningWalletService";

const checkoutSchema = z.object({
  agentId: z.string(),
  buyerId: z.string().min(2).default("frontend-user"),
  amountSats: z.number().int().positive()
});

export const paymentRoutes = Router();

const verifySchema = z.object({
  preimage: z.string().min(16)
});
const walletInvoiceSchema = z.object({
  amountSats: z.number().int().positive().default(1),
  description: z.string().optional()
});
const walletPaySchema = z.object({
  invoice: z.string().min(10)
});

paymentRoutes.post("/checkout", async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  try {
    const checkout = await paymentService.createCheckout({
      agentId: parsed.data.agentId,
      buyerId: parsed.data.buyerId,
      amountSats: parsed.data.amountSats,
      requestPath: req.originalUrl,
      requestMethod: req.method
    });

    return res.status(201).json(checkout);
  } catch (error) {
    return res.status(502).json({
      error: "invoice_generation_failed",
      message: error instanceof Error ? error.message : "Unable to create checkout"
    });
  }
});

paymentRoutes.get("/:sessionId", (req, res) => {
  const session = paymentService.getSession(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ message: "Checkout session not found" });
  }
  return res.json(session);
});

paymentRoutes.post("/:sessionId/finalize-paid-call", (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }
  const result = paymentService.finalizePaidCall({
    checkoutId: req.params.sessionId,
    preimage: parsed.data.preimage
  });
  if (!result.ok) {
    if (result.reason === "not_found") return res.status(404).json({ error: "checkout_not_found" });
    if (result.reason === "already_consumed") return res.status(409).json({ error: "checkout_already_consumed" });
    if (result.reason === "not_settled") return res.status(400).json({ error: "checkout_not_settled" });
    return res.status(401).json({ error: "invalid_preimage" });
  }
  return res.json({ ok: true });
});

paymentRoutes.post("/:sessionId/verify", async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  const result = await paymentService.verifyAndSettle({
    checkoutId: req.params.sessionId,
    preimage: parsed.data.preimage,
    requestPath: req.originalUrl,
    requestMethod: req.method
  });

  if (!result.ok) {
    if (result.reason === "not_found") {
      return res.status(404).json({ error: "checkout_not_found" });
    }
    if (result.reason === "expired") {
      return res.status(410).json({ error: "checkout_expired" });
    }
    if (result.reason === "hash_reused") {
      return res.status(409).json({ error: "payment_hash_reused" });
    }
    if (result.reason === "already_consumed") {
      return res.status(409).json({ error: "checkout_already_consumed" });
    }
    return res.status(401).json({ error: "invalid_preimage" });
  }

  return res.json({
    ok: true,
    checkout: result.session
  });
});

paymentRoutes.post("/:sessionId/agent-pay", async (req, res) => {
  try {
    const result = await paymentService.simulateAgentPayment(req.params.sessionId);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return res.status(404).json({ error: "checkout_not_found" });
      }
      if (result.reason === "expired") {
        return res.status(410).json({ error: "checkout_expired" });
      }
      if (result.reason === "hash_reused") {
        return res.status(409).json({ error: "payment_hash_reused" });
      }
      return res.status(400).json({ error: result.reason });
    }

    return res.json({
      ok: true,
      preimage: result.preimage,
      checkout: result.session
    });
  } catch (error) {
    return res.status(502).json({
      error: "agent_wallet_payment_failed",
      message: error instanceof Error ? error.message : "Unable to auto-pay invoice."
    });
  }
});

paymentRoutes.get("/logs/recent", (req, res) => {
  const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));
  return res.json({
    logs: paymentService.getLogs(limit)
  });
});

paymentRoutes.get("/wallet/info", async (_req, res) => {
  try {
    const info = await lightningWalletService.getWalletInfo();
    return res.json({ ok: true, ...info });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : "wallet_info_failed"
    });
  }
});

paymentRoutes.post("/wallet/invoice", async (req, res) => {
  const parsed = walletInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  try {
    const amountSats = Math.max(1, Number(parsed.data.amountSats));
    const invoice = await lightningWalletService.createInvoice({
      amountSats,
      memo: parsed.data.description?.trim() || "ShotenX wallet invoice",
      expirySeconds: 600
    });
    return res.json({
      ok: true,
      amountSats,
      invoice: invoice.invoice,
      paymentHash: invoice.paymentHash
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : "invoice_generation_failed"
    });
  }
});

paymentRoutes.post("/wallet/pay", async (req, res) => {
  const parsed = walletPaySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }
  try {
    const payment = await lightningWalletService.payInvoiceAsAgent(parsed.data.invoice);
    return res.json({
      ok: true,
      preimage: payment.preimage
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : "invoice_payment_failed"
    });
  }
});
