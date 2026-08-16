// Server-only business logic for merchant settings, API keys and STK pushes.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  getDarajaConfig,
  initiateStkPush,
  normalizePhone,
} from "./mpesa.server";

export async function hashApiKey(raw: string): Promise<string> {
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateApiKey(): { raw: string; prefix: string } {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 32);
  const raw = `pw_live_${body}`;
  return { raw, prefix: raw.slice(0, 12) };
}

export type PushInput = {
  phone: string;
  amount: number;
  accountReference?: string | undefined;
  description?: string | undefined;
};

export async function loadMasterCredentials() {
  const { data } = await supabaseAdmin
    .from("platform_credentials")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  return data;
}

export async function runStkPush(
  userId: string,
  input: PushInput,
  apiKeyId: string | null,
  origin: string,
) {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Enter a valid Kenyan phone number");
  if (!(input.amount >= 1)) throw new Error("Amount must be at least KES 1");

  const { data: settings } = await supabaseAdmin
    .from("merchant_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const master = await loadMasterCredentials();
  const config = getDarajaConfig(master);
  const shortcode = settings?.shortcode || config.shortcode;
  const passkey = settings?.passkey || config.passkey;
  const accountReference =
    input.accountReference || settings?.account_reference || "PayWave";
  const description = input.description || "Payment";
  const callbackUrl =
    settings?.callback_url ||
    master?.default_callback_url ||
    `${origin}/api/public/stk/callback`;

  const { data: tx, error: txError } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: userId,
      api_key_id: apiKeyId,
      phone,
      amount: input.amount,
      account_reference: accountReference,
      description,
      shortcode,
      status: "pending",
    })
    .select()
    .single();
  if (txError || !tx) throw new Error(txError?.message ?? "Could not record transaction");

  try {
    const result = await initiateStkPush(config, {
      phone,
      amount: input.amount,
      shortcode,
      passkey,
      accountType: settings?.account_type ?? "paybill",
      accountReference,
      description,
      callbackUrl,
    });

    const body = result.body as Record<string, string | undefined>;
    if (!result.ok || body["ResponseCode"] !== "0") {
      await supabaseAdmin
        .from("transactions")
        .update({
          status: "failed",
          result_desc:
            body["errorMessage"] ?? body["ResponseDescription"] ?? "Daraja rejected the request",
        })
        .eq("id", tx.id);
      throw new Error(
        body["errorMessage"] ?? body["ResponseDescription"] ?? "STK push failed",
      );
    }

    await supabaseAdmin
      .from("transactions")
      .update({
        merchant_request_id: body["MerchantRequestID"] ?? null,
        checkout_request_id: body["CheckoutRequestID"] ?? null,
        result_desc: body["CustomerMessage"] ?? null,
      })
      .eq("id", tx.id);

    return {
      transactionId: tx.id,
      checkoutRequestId: body["CheckoutRequestID"] ?? null,
      message: body["CustomerMessage"] ?? "STK push sent",
    };
  } catch (error) {
    await supabaseAdmin
      .from("transactions")
      .update({
        status: "failed",
        result_desc: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", tx.id);
    throw error;
  }
}