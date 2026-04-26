"use client";

import { Checkout } from "@moneydevkit/nextjs";
import { use } from "react";

export default function CheckoutPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-3xl rounded-xl border bg-white p-4">
        <Checkout id={id} />
      </div>
    </main>
  );
}
