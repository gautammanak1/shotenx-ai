import { Request, Response, NextFunction } from "express";
import { paymentService } from "../services/paymentService";

const defaultPrice = Number(process.env.DEFAULT_L402_PRICE_SATS ?? 25);

type ParsedAuth = {
  checkoutId: string;
  preimage: string;
};

const parseAuthorization = (headerValue?: string): ParsedAuth | null => {
  if (!headerValue?.trim()) return null;
  if (!headerValue.startsWith("L402 ")) return null;
  const value = headerValue.slice(5).trim();
  const split = value.indexOf(":");
  if (split <= 0) return null;
  return {
    checkoutId: value.slice(0, split),
    preimage: value.slice(split + 1)
  };
};

/** Merge fixed price (sats) into body before running the standard L402 paywall. */
export const l402PaywallFor =
  (amountSats: number) => async (req: Request, res: Response, next: NextFunction) => {
    const body = (typeof req.body === "object" && req.body !== null ? req.body : {}) as Record<
      string,
      unknown
    >;
    req.body = { ...body, amountSats };
    return l402Paywall(req, res, next);
  };

export const l402Paywall = async (req: Request, res: Response, next: NextFunction) => {
  const parsedAuth = parseAuthorization(req.header("authorization") ?? undefined);
  const fallbackCheckoutId = req.header("x-payment-token");
  const checkoutId = parsedAuth?.checkoutId ?? fallbackCheckoutId;

  if (parsedAuth && checkoutId) {
    const verified = await paymentService.verifyAndSettle({
      checkoutId,
      preimage: parsedAuth.preimage,
      requestPath: req.originalUrl,
      requestMethod: req.method
    });

    if (verified.ok) {
      paymentService.consumeSession(checkoutId, req.originalUrl, req.method);
      return next();
    }

    if (verified.reason === "expired") {
      return res.status(401).json({ error: "l402_expired", message: "Payment challenge has expired." });
    }
    if (verified.reason === "hash_reused") {
      return res.status(409).json({ error: "l402_double_spend", message: "Payment proof already consumed." });
    }
    if (verified.reason === "already_consumed") {
      return res.status(409).json({ error: "l402_already_consumed", message: "Checkout token has already been used." });
    }
    return res.status(401).json({ error: "l402_invalid_proof", message: "Invalid L402 proof." });
  }

  if (checkoutId && paymentService.isSettled(checkoutId)) {
    paymentService.consumeSession(checkoutId, req.originalUrl, req.method);
    return next();
  }

  try {
    const checkout = await paymentService.createCheckout({
      agentId: req.body?.agentId ?? "generic-premium-tool",
      buyerId: req.body?.buyerId ?? "anonymous-agent",
      amountSats: Number(req.body?.amountSats ?? defaultPrice),
      requestPath: req.originalUrl,
      requestMethod: req.method
    });

    const challenge = {
      type: "https://docs.shotenx.ai/errors/payment-required",
      title: "Payment Required",
      status: 402,
      detail: "Pay the Lightning invoice and retry with Authorization: L402 <checkoutId>:<preimage>.",
      l402: {
        version: "1.0",
        scheme: "L402",
        checkoutId: checkout.id,
        amountSats: checkout.amountSats,
        paymentHash: checkout.paymentHash,
        paymentRequest: checkout.invoice,
        expiresAt: checkout.expiresAt,
        verifyEndpoint: `/api/payments/${checkout.id}/verify`,
        retry: {
          method: req.method,
          url: req.originalUrl
        }
      }
    };

    res.setHeader(
      "WWW-Authenticate",
      `L402 token="${checkout.id}", invoice="${checkout.invoice}", amount=${checkout.amountSats}`
    );
    return res.status(402).json(challenge);
  } catch (error) {
    return res.status(502).json({
      error: "invoice_generation_failed",
      message: error instanceof Error ? error.message : "Unable to create Lightning invoice."
    });
  }
};
