import { createClient } from "@/lib/supabase";
import type { PaymentLog } from "@/lib/api";

export type DisplayPaymentLog = PaymentLog & { ledger: "backend" | "supabase" };

export type SupabaseTransactionRow = {
  id: string;
  user_id: string;
  amount_sats: number;
  service_name: string;
  payment_hash: string | null;
  status: PaymentLog["status"];
  checkout_id: string | null;
  request_path: string | null;
  event: string;
  created_at: string;
};

const STATUS_SET = new Set<PaymentLog["status"]>(["pending", "settled", "consumed", "expired", "failed"]);

export function mapSupabaseTransactionToDisplayLog(row: SupabaseTransactionRow): DisplayPaymentLog {
  const status = row.status as PaymentLog["status"];
  return {
    id: `sb-${row.id}`,
    checkoutId: row.checkout_id ?? "",
    requestPath: row.request_path ?? "/supabase/transactions",
    requestMethod: "POST",
    amountSats: row.amount_sats,
    status: STATUS_SET.has(status) ? status : "pending",
    event: row.event || "supabase",
    timestamp: row.created_at,
    detail: row.service_name,
    ledger: "supabase",
  };
}

export async function fetchUserSupabaseTransactions(): Promise<DisplayPaymentLog[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, user_id, amount_sats, service_name, payment_hash, status, checkout_id, request_path, event, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];

  return (data as SupabaseTransactionRow[]).map(mapSupabaseTransactionToDisplayLog);
}

export async function insertUserTransaction(params: {
  amountSats: number;
  serviceName: string;
  status?: PaymentLog["status"];
  paymentHash?: string | null;
  checkoutId?: string | null;
  requestPath?: string | null;
  event?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "not_signed_in" };

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount_sats: params.amountSats,
    service_name: params.serviceName,
    status: params.status ?? "settled",
    payment_hash: params.paymentHash ?? null,
    checkout_id: params.checkoutId ?? null,
    request_path: params.requestPath ?? null,
    event: params.event ?? "app",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
