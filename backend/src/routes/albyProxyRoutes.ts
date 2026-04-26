import { Router } from "express";
import { z } from "zod";
import { lightningWalletService } from "../services/lightningWalletService";

const walletInvoiceSchema = z.object({
  amountSats: z.number().int().positive().default(1),
  description: z.string().optional()
});

const walletPaySchema = z.object({
  invoice: z.string().min(10)
});

/** Next.js `/api/alby/*` compatibility — delegates to the same NWC wallet helpers as `/api/payments/wallet/*`. */
export const albyProxyRoutes = Router();

albyProxyRoutes.get("/wallet/info", async (_req, res) => {
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

albyProxyRoutes.post("/wallet/invoice", async (req, res) => {
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

albyProxyRoutes.post("/wallet/pay", async (req, res) => {
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
