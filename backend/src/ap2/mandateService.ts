import { randomUUID } from "node:crypto";
import type { Ap2DraftBundle, IntentMandateDraft, PaymentMandateDraft } from "./types";

const DEFAULT_AP2_VERSION = "0.1-draft";

function parseAmountHint(text: string): { currency: string; value: string } | undefined {
  const m = text.match(/\$\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  if (m) {
    return { currency: "USD", value: m[1] };
  }
  const eur = text.match(/€\s*([0-9]+(?:\.[0-9]{1,2})?)/);
  if (eur) {
    return { currency: "EUR", value: eur[1] };
  }
  return undefined;
}

function parseMerchantHint(text: string): string | undefined {
  const m = text.match(/merchant\s*(?:id)?\s*[:#]?\s*([a-z0-9_.-]+)/i);
  return m ? m[1] : process.env.AP2_MERCHANT_ID?.trim() || undefined;
}

function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

/**
 * Builds draft AP2-style mandates from natural language (no real signing or PSP calls).
 */
export function buildDraftMandatesFromUserText(userText: string): Ap2DraftBundle {
  const now = new Date().toISOString();
  const summary = userText.trim().slice(0, 500) || "Unspecified purchase intent.";
  const amount = parseAmountHint(userText);
  const merchantId = parseMerchantHint(userText);
  const rail = process.env.AP2_PAYMENT_RAIL?.trim() || "card_or_open_banking_stub";

  const intent: IntentMandateDraft = {
    kind: "intent_mandate",
    id: `im_${randomUUID()}`,
    created_at: now,
    expires_at: addHours(now, 24),
    summary,
    ...(amount ? { amount_max: amount } : {}),
    merchant_id: merchantId,
    constraints: [
      "Single capture only unless user issues a new intent mandate.",
      "Merchant scope limited to the described SKU / merchant id when present.",
      "No standing authorization beyond expires_at."
    ],
    ap2_version: process.env.AP2_PROTOCOL_VERSION?.trim() || DEFAULT_AP2_VERSION
  };

  const payment: PaymentMandateDraft = {
    kind: "payment_mandate",
    id: `pm_${randomUUID()}`,
    created_at: now,
    intent_mandate_id: intent.id,
    status: "ready_for_signing",
    rail,
    note:
      "Draft only: attach ES256 / VC proofs and route to your AP2-ready gateway or PSP per https://agentpaymentsprotocol.info/docs/"
  };

  return {
    intent_mandate: intent,
    payment_mandate: payment,
    next_steps: [
      "Have the user review and cryptographically sign the intent mandate (AP2).",
      "Exchange signed intent for a cart mandate from the merchant when applicable.",
      "Submit a signed payment mandate to your payment rail / gateway.",
      "Store mandate ids and audit payloads for disputes."
    ]
  };
}
