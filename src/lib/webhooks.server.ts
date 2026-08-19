// Server-only merchant webhook delivery. Signed with the merchant's webhook secret.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `whsec_${Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function signPayload(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type PaymentEvent =
  | "payment.succeeded"
  | "payment.failed"
  | "payment.cancelled";

type TransactionRow = {
  id: string;
  user_id: string;
  phone: string;
  amount: number | string;
  status: string;
  account_reference: string | null;
  description: string | null;
  shortcode: string | null;
  mpesa_receipt: string | null;
  checkout_request_id: string | null;
  result_code: string | null;
  result_desc: string | null;
  created_at: string;
};

/**
 * Delivers a payment confirmation to the merchant's webhook URL.
 * Retries a few times with backoff; every attempt is logged in webhook_deliveries.
 */
export async function deliverPaymentWebhook(tx: TransactionRow) {
  const { data: settings } = await supabaseAdmin
    .from("merchant_settings")
    .select("webhook_url, webhook_secret")
    .eq("user_id", tx.user_id)
    .maybeSingle();

  const url = settings?.webhook_url?.trim();
  if (!url) return;

  const event: PaymentEvent =
    tx.status === "success"
      ? "payment.succeeded"
      : tx.status === "cancelled"
        ? "payment.cancelled"
        : "payment.failed";

  const payload = {
    id: `evt_${tx.id}`,
    event,
    createdAt: new Date().toISOString(),
    data: {
      transactionId: tx.id,
      status: tx.status,
      amount: Number(tx.amount),
      currency: "KES",
      phone: tx.phone,
      shortcode: tx.shortcode,
      accountReference: tx.account_reference,
      description: tx.description,
      mpesaReceipt: tx.mpesa_receipt,
      checkoutRequestId: tx.checkout_request_id,
      resultCode: tx.result_code,
      resultDesc: tx.result_desc,
      initiatedAt: tx.created_at,
    },
  };

  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const secret = settings?.webhook_secret ?? "";
  const signature = secret ? await signPayload(secret, `${timestamp}.${body}`) : null;

  const { data: delivery } = await supabaseAdmin
    .from("webhook_deliveries")
    .insert({
      user_id: tx.user_id,
      transaction_id: tx.id,
      url,
      event,
      payload,
      status: "pending",
    })
    .select("id")
    .single();

  let lastStatus: number | null = null;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "PayWave-Webhook/1",
          "X-PayWave-Event": event,
          "X-PayWave-Timestamp": timestamp,
          ...(signature ? { "X-PayWave-Signature": `t=${timestamp},v1=${signature}` } : {}),
        },
        body,
      });
      lastStatus = res.status;
      if (res.ok) {
        if (delivery) {
          await supabaseAdmin
            .from("webhook_deliveries")
            .update({
              status: "delivered",
              attempts: attempt,
              response_status: res.status,
              delivered_at: new Date().toISOString(),
              error: null,
            })
            .eq("id", delivery.id);
        }
        return;
      }
      lastError = `Merchant endpoint responded ${res.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Request failed";
    }

    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
  }

  if (delivery) {
    await supabaseAdmin
      .from("webhook_deliveries")
      .update({
        status: "failed",
        attempts: 3,
        response_status: lastStatus,
        error: lastError,
      })
      .eq("id", delivery.id);
  }
}
