import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getMerchantSettings, saveMerchantSettings } from "@/lib/payments.functions";
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
          "Choose your account type and enter the till or paybill number that receives your M-Pesa funds.",
      },
      { property: "og:title", content: "Merchant settings — PayWave" },
      {
        property: "og:description",
        content: "Point PayWave at your own M-Pesa till or paybill number.",
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

  const settings = useQuery({ queryKey: ["merchant-settings"], queryFn: () => fetchSettings() });

  const [shortcode, setShortcode] = useState("");
  const [accountType, setAccountType] = useState<"paybill" | "till">("paybill");

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    setShortcode(data.shortcode ?? "");
    setAccountType((data.account_type as "paybill" | "till") ?? "paybill");
  }, [settings.data]);

  const mutation = useMutation({
    mutationFn: () => save({ data: { shortcode, account_type: accountType } }),
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["merchant-settings"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  return (
    <div className="max-w-2xl rounded-2xl border border-border bg-card p-6">
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

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </div>
  );
}
