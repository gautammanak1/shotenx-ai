/**
 * Minimal shapes for Agent Payments Protocol (AP2) style mandates.
 * @see https://agentpaymentsprotocol.info/docs/
 *
 * Production flows require user-signed mandates, verifiable credentials, and your PSP / rail.
 */

export interface IntentMandateDraft {
  kind: "intent_mandate";
  id: string;
  created_at: string;
  expires_at: string;
  summary: string;
  /** When omitted, amount must be refined before signing. */
  amount_max?: { currency: string; value: string };
  merchant_id?: string;
  constraints: string[];
  ap2_version: string;
}

export interface PaymentMandateDraft {
  kind: "payment_mandate";
  id: string;
  created_at: string;
  intent_mandate_id: string;
  status: "draft" | "ready_for_signing";
  rail: string;
  note: string;
}

export interface Ap2DraftBundle {
  intent_mandate: IntentMandateDraft;
  payment_mandate: PaymentMandateDraft;
  next_steps: string[];
}
