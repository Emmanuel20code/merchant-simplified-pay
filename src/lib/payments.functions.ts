import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMerchantSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("merchant_settings")
      .select("user_id, shortcode, account_type, account_reference, callback_url")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const saveMerchantSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        shortcode: z.string().trim().max(12).optional(),
        account_type: z.enum(["paybill", "till"]),
        account_reference: z.string().trim().max(64).optional(),
        callback_url: z.string().trim().max(300).optional(),
        passkey: z.string().trim().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const payload: Record<string, string | null> = {
      shortcode: data.shortcode || null,
      account_type: data.account_type,
      account_reference: data.account_reference || null,
      callback_url: data.callback_url || null,
    };
    if (data.passkey) payload["passkey"] = data.passkey;

    const { error } = await context.supabase
      .from("merchant_settings")
      .upsert({ user_id: context.userId, ...payload });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ name: z.string().trim().min(1).max(60) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { generateApiKey, hashApiKey } = await import("./payments.server");
    const { raw, prefix } = generateApiKey();
    const { error } = await context.supabase.from("api_keys").insert({
      user_id: context.userId,
      name: data.name,
      key_hash: await hashApiKey(raw),
      key_prefix: prefix,
    });
    if (error) throw new Error(error.message);
    return { key: raw };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("transactions")
      .select(
        "id, phone, amount, status, account_reference, description, mpesa_receipt, result_desc, created_at",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const sendStkPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        phone: z.string().trim().min(9).max(15),
        amount: z.number().min(1).max(300000),
        accountReference: z.string().trim().max(64).optional(),
        description: z.string().trim().max(60).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { runStkPush } = await import("./payments.server");
    const origin = new URL(getRequest().url).origin;
    return runStkPush(context.userId, data, null, origin);
  });