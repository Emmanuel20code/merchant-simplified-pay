import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  phone: z.string().trim().min(9).max(15),
  amount: z.number().min(1).max(300000),
  accountReference: z.string().trim().max(64).optional(),
  description: z.string().trim().max(60).optional(),
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/stk/push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const rawKey = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
        if (!rawKey) return json({ error: "Missing API key" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { hashApiKey, runStkPush } = await import("@/lib/payments.server");

        const { data: keyRow } = await supabaseAdmin
          .from("api_keys")
          .select("id, user_id, revoked_at")
          .eq("key_hash", await hashApiKey(rawKey))
          .maybeSingle();

        if (!keyRow || keyRow.revoked_at) return json({ error: "Invalid API key" }, 401);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid request body" }, 400);

        await supabaseAdmin
          .from("api_keys")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", keyRow.id);

        try {
          const result = await runStkPush(
            keyRow.user_id,
            parsed.data,
            keyRow.id,
            new URL(request.url).origin,
          );
          return json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : "STK push failed";
          console.error("STK push failed:", message);
          return json({ error: message }, 502);
        }
      },
    },
  },
});