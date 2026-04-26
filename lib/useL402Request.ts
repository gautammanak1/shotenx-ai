"use client";

import { useCallback, useState } from "react";

type L402Challenge = {
  l402?: {
    checkoutId?: string;
    paymentRequest?: string;
    amountSats?: number;
  };
};

type L402State = {
  loading: boolean;
  invoice?: string;
  checkoutId?: string;
  amountSats?: number;
  error?: string;
};

const parseError = (value: unknown, fallback: string) => {
  if (typeof value === "string" && value.trim()) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message;
    if (typeof record.error === "string" && record.error.trim()) return record.error;
  }
  return fallback;
};

export function useL402Request() {
  const [state, setState] = useState<L402State>({ loading: false });

  const callPaidApi = useCallback(
    async <T>(url: string, body: Record<string, unknown>, maxRetries = 1): Promise<T> => {
      setState({ loading: true });

      const runRequest = async (authorization?: string) => {
        return fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authorization ? { Authorization: authorization } : {})
          },
          body: JSON.stringify(body)
        });
      };

      let response = await runRequest();
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        if (response.status !== 402) {
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
            throw new Error(parseError(payload, "Paid API request failed"));
          }
          const data = (await response.json()) as T;
          setState({ loading: false });
          return data;
        }

        const challenge = (await response.json()) as L402Challenge;
        const invoice = challenge.l402?.paymentRequest;
        const checkoutId = challenge.l402?.checkoutId;
        const amountSats = challenge.l402?.amountSats;

        if (!invoice || !checkoutId) {
          throw new Error("Invalid L402 challenge payload");
        }

        setState({
          loading: true,
          invoice,
          checkoutId,
          amountSats
        });

        const { requestProvider } = await import("@getalby/bitcoin-connect");
        const provider = await requestProvider();
        const payment = (await provider.sendPayment(invoice)) as Record<string, unknown>;
        const preimageCandidate = [
          payment.preimage,
          payment.payment_preimage,
          payment.paymentPreimage
        ].find((value) => typeof value === "string" && value.trim());
        const preimage = typeof preimageCandidate === "string" ? preimageCandidate : "";
        if (!preimage) {
          throw new Error("Lightning payment failed in connected wallet");
        }

        response = await runRequest(`L402 ${checkoutId}:${preimage}`);
      }

      throw new Error("L402 retry limit exceeded");
    },
    []
  );

  return { callPaidApi, state };
}
