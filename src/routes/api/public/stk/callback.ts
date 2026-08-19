import { createFileRoute } from "@tanstack/react-router";

type CallbackItem = { Name: string; Value?: string | number };

export const Route = createFileRoute("/api/public/stk/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = (await request.json().catch(() => null)) as
          | {
              Body?: {
                stkCallback?: {
                  CheckoutRequestID?: string;
                  ResultCode?: number;
                  ResultDesc?: string;
                  CallbackMetadata?: { Item?: CallbackItem[] };
                };
              };
            }
          | null;

        const callback = payload?.Body?.stkCallback;
        if (!callback?.CheckoutRequestID) {
          return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Ignored" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const items = callback.CallbackMetadata?.Item ?? [];
        const receipt = items.find((item) => item.Name === "MpesaReceiptNumber")?.Value;
        const succeeded = callback.ResultCode === 0;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: updated } = await supabaseAdmin
          .from("transactions")
          .update({
            status: succeeded ? "success" : callback.ResultCode === 1032 ? "cancelled" : "failed",
            result_code: String(callback.ResultCode ?? ""),
            result_desc: callback.ResultDesc ?? null,
            mpesa_receipt: receipt ? String(receipt) : null,
          })
          .eq("checkout_request_id", callback.CheckoutRequestID)
          .select("*")
          .maybeSingle();

        // Notify the merchant's own webhook endpoint about the final outcome.
        if (updated) {
          const { deliverPaymentWebhook } = await import("@/lib/webhooks.server");
          try {
            await deliverPaymentWebhook(updated);
          } catch (error) {
            console.error("Merchant webhook delivery failed:", error);
          }
        }

        return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});