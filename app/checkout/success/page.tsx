"use client";

import Link from "next/link";
import { useCheckoutSuccess } from "@moneydevkit/nextjs";

export default function CheckoutSuccessPage() {
  const { isCheckoutPaidLoading, isCheckoutPaid, metadata } = useCheckoutSuccess();

  if (isCheckoutPaidLoading || isCheckoutPaid === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="rounded-md border bg-white px-4 py-2 text-sm">Verifying payment...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-xl rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">
          {isCheckoutPaid ? "Payment confirmed" : "Payment not confirmed"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isCheckoutPaid
            ? "Your Lightning payment is verified. You can continue using premium agent actions."
            : "Checkout exists but payment verification did not pass yet."}
        </p>
        {metadata && (
          <pre className="mt-4 overflow-auto rounded-md border bg-slate-50 p-3 text-xs">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        )}
        <div className="mt-4 flex gap-2">
          <Link href="/chat-pay" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white">
            Back to Paid Chat
          </Link>
          <Link href="/marketplace" className="rounded-md border px-4 py-2 text-sm">
            Open Marketplace
          </Link>
        </div>
      </div>
    </main>
  );
}
