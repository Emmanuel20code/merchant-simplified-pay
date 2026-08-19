import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getMerchantSettings,
  listWebhookDeliveries,
  rotateWebhookSecret,
  saveMerchantSettings,
} from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Merchant settings — PayWave" },
      {
        name: "description",
        content:
          "Choose your account type, enter the till or paybill number that receives your M-Pesa funds, and set the webhook that receives payment confirmations.",
      },
      { property: "og:title", content: "Merchant settings — PayWave" },
      {
        property: "og:description",
        content: "Point PayWave at your own M-Pesa till or paybill number and your webhook.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchSettings = useServerFn(getMerchantSettings);
  const save = useServerFn(saveMerchantSettings);
  const rotate = useServerFn(rotateWebhookSecret);
  const fetchDeliveries = useServerFn(listWebhookDeliveries);

  const settings = useQuery({ queryKey: ["merchant-settings"], queryFn: () => fetchSettings() });
  const deliveries = useQuery({
    queryKey: ["webhook-deliveries"],
    queryFn: () => fetchDeliveries(),
  });

  const [shortcode, setShortcode] = useState("");
  const [accountType, setAccountType] = useState<"paybill" | "till">("paybill");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [newSecret, setNewSecret] = useState<string | null>(null);

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    setShortcode(data.shortcode ?? "");
    setAccountType((data.account_type as "paybill" | "till") ?? "paybill");
    setWebhookUrl(data.webhook_url ?? "");
  }, [settings.data]);

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: { shortcode, account_type: accountType, webhook_url: webhookUrl.trim() },
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["merchant-settings"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  const rotateMutation = useMutation({
    mutationFn: () => rotate(),
    onSuccess: (result) => {
      setNewSecret(result.secret);
      toast.success("New signing secret generated. Copy it now.");
      queryClient.invalidateQueries({ queryKey: ["merchant-settings"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not rotate secret"),
  });

  const hasSecret = Boolean(settings.data?.webhook_secret);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Merchant settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Funds settle straight into your own till or paybill. Everything else is handled for
          you.
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="type">Account type</Label>
            <Select
              value={accountType}
              onValueChange={(value) => setAccountType(value as "paybill" | "till")}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paybill">Paybill</SelectItem>
                <SelectItem value="till">Till (Buy Goods)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shortcode">
              {accountType === "till" ? "Till number" : "Paybill number"}
            </Label>
            <Input
              id="shortcode"
              inputMode="numeric"
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value.replace(/\D/g, ""))}
              placeholder="174379"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhook">Payment confirmation webhook (optional)</Label>
            <Input
              id="webhook"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yourshop.co.ke/api/paywave/webhook"
            />
            <p className="text-xs text-muted-foreground">
              We POST every completed, failed or cancelled payment to this https URL and retry
              up to 3 times.
            </p>
          </div>

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Webhook signing secret</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every request carries an <code>X-PayWave-Signature</code> header in the form
          {" "}
          <code>t=&lt;timestamp&gt;,v1=&lt;hex&gt;</code>, an HMAC-SHA256 of
          {" "}
          <code>&lt;timestamp&gt;.&lt;raw body&gt;</code> using this secret. Verify it before
          trusting a payment.
        </p>

        {newSecret ? (
          <p className="mt-4 break-all rounded-lg border border-border bg-muted p-3 font-mono text-xs text-foreground">
            {newSecret}
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {hasSecret
              ? "A secret is active. Rotate it to get a new value (the old one stops working)."
              : "No secret yet — generate one so you can verify incoming webhooks."}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={rotateMutation.isPending}
          onClick={() => rotateMutation.mutate()}
        >
          {rotateMutation.isPending
            ? "Generating…"
            : hasSecret
              ? "Rotate secret"
              : "Generate secret"}
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Recent webhook deliveries</h2>
        {deliveries.data && deliveries.data.length > 0 ? (
          <ul className="mt-4 divide-y divide-border text-sm">
            {deliveries.data.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-foreground">{item.event}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString()} · {item.attempts} attempt(s)
                    {item.error ? ` · ${item.error}` : ""}
                  </p>
                </div>
                <span
                  className={
                    item.status === "delivered"
                      ? "text-xs font-medium text-foreground"
                      : "text-xs font-medium text-destructive"
                  }
                >
                  {item.status}
                  {item.response_status ? ` (${item.response_status})` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing sent yet. Deliveries appear here once payments complete.
          </p>
        )}
      </div>
    </div>
  );
}
