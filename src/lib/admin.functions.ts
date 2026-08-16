import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const credentialsSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  consumer_key: z.string().trim().max(200).optional(),
  consumer_secret: z.string().trim().max(200).optional(),
  default_shortcode: z.string().trim().max(12).optional(),
  default_passkey: z.string().trim().max(200).optional(),
  default_callback_url: z.string().trim().max(300).optional(),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: super admin only");
}

export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    return { isAdmin: Boolean(data), adminExists: (count ?? 0) > 0 };
  });

// Bootstrap: the first signed-in user may claim super admin when none exists yet.
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("A super admin already exists");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlatformCredentials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("platform_credentials")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const mask = (v: string | null | undefined) =>
      v ? `${v.slice(0, 4)}••••${v.slice(-2)}` : null;
    return {
      environment: (data?.environment ?? "sandbox") as "sandbox" | "production",
      consumer_key: data?.consumer_key ?? "",
      default_shortcode: data?.default_shortcode ?? "",
      default_callback_url: data?.default_callback_url ?? "",
      consumer_secret_masked: mask(data?.consumer_secret),
      default_passkey_masked: mask(data?.default_passkey),
      updated_at: data?.updated_at ?? null,
    };
  });

export const savePlatformCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => credentialsSchema.parse(data))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload: {
      environment: string;
      consumer_key: string | null;
      default_shortcode: string | null;
      default_callback_url: string | null;
      updated_by: string;
      consumer_secret?: string;
      default_passkey?: string;
    } = {
      environment: data.environment,
      consumer_key: data.consumer_key || null,
      default_shortcode: data.default_shortcode || null,
      default_callback_url: data.default_callback_url || null,
      updated_by: context.userId,
    };
    // Secrets stay unchanged when left blank.
    if (data.consumer_secret) payload.consumer_secret = data.consumer_secret;
    if (data.default_passkey) payload.default_passkey = data.default_passkey;

    const { error } = await supabaseAdmin
      .from("platform_credentials")
      .update(payload)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlatformOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: merchants }, { data: txs }, { data: admins }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, email, business_name, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("transactions")
        .select("id, user_id, phone, amount, status, shortcode, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin"),
    ]);

    const settled = (txs ?? []).filter((t) => t.status === "success");
    return {
      merchants: merchants ?? [],
      transactions: txs ?? [],
      adminUserIds: (admins ?? []).map((a) => a.user_id),
      stats: {
        merchantCount: (merchants ?? []).length,
        transactionCount: (txs ?? []).length,
        volume: settled.reduce((sum, t) => sum + Number(t.amount), 0),
      },
    };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), makeAdmin: z.boolean() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && !data.makeAdmin) {
      throw new Error("You cannot remove your own super admin access");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.makeAdmin) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
