import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

import {
  claimSuperAdmin,
  getAdminStatus,
  getPlatformCredentials,
  getPlatformOverview,
  savePlatformCredentials,
  setUserRole,
} from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Super admin console — PayWave" },
      {
        name: "description",
        content:
          "Manage PayWave's master Daraja API credentials, merchants and platform-wide M-Pesa activity.",
      },
      { property: "og:title", content: "PayWave super admin console" },
      {
        property: "og:description",
        content: "Master Daraja credentials and platform oversight for PayWave operators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const fetchStatus = useServerFn(getAdminStatus);
  const claim = useServerFn(claimSuperAdmin);

  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => fetchStatus() });

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: () => {
      toast.success("You are now the PayWave super admin");
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not claim"),
  });

  if (status.isLoading) {
    return <p className="text-sm text-muted-foreground">Checking access…</p>;
  }

  if (!status.data?.isAdmin) {
    return (
      <div className="max-w-lg rounded-2xl border border-border bg-card p-6">
        <ShieldCheck className="size-6 text-primary" />
        <h1 className="mt-3 text-lg font-semibold text-foreground">Super admin console</h1>
        {status.data?.adminExists ? (
          <p className="mt-1 text-sm text-muted-foreground">
            This area is restricted to PayWave platform operators.
          </p>
        ) : (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              No super admin exists yet. Claim the role to configure the master Daraja
              credentials that power every merchant's payments.
            </p>
            <Button
              className="mt-4"
              onClick={() => claimMutation.mutate()}
              disabled={claimMutation.isPending}
            >
              Claim super admin
            </Button>
          </>
        )}
      </div>
    );
  }

  return <AdminConsole />;
}

function AdminConsole() {
  const queryClient = useQueryClient();
  const fetchCreds = useServerFn(getPlatformCredentials);
  const saveCreds = useServerFn(savePlatformCredentials);
  const fetchOverview = useServerFn(getPlatformOverview);
  const updateRole = useServerFn(setUserRole);

  const creds = useQuery({ queryKey: ["platform-credentials"], queryFn: () => fetchCreds() });
  const overview = useQuery({ queryKey: ["platform-overview"], queryFn: () => fetchOverview() });

  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [passkey, setPasskey] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");

  useEffect(() => {
    const d = creds.data;
    if (!d) return;
    setEnvironment(d.environment);
    setConsumerKey(d.consumer_key);
    setShortcode(d.default_shortcode);
    setCallbackUrl(d.default_callback_url);
  }, [creds.data]);

  const save = useMutation({
    mutationFn: () =>
      saveCreds({
        data: {
          environment,
          consumer_key: consumerKey,
          default_shortcode: shortcode,
          default_callback_url: callbackUrl,
          ...(consumerSecret ? { consumer_secret: consumerSecret } : {}),
          ...(passkey ? { default_passkey: passkey } : {}),
        },
      }),
    onSuccess: () => {
      toast.success("Master credentials saved");
      setConsumerSecret("");
      setPasskey("");
      queryClient.invalidateQueries({ queryKey: ["platform-credentials"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; makeAdmin: boolean }) => updateRole({ data: vars }),
    onSuccess: () => {
      toast.success("Access updated");
      queryClient.invalidateQueries({ queryKey: ["platform-overview"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update"),
  });

  const stats = overview.data?.stats;
  const adminIds = overview.data?.adminUserIds ?? [];

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-primary" />
        <div>
          <h1 className="text-lg font-semibold text-foreground">Super admin console</h1>
          <p className="text-sm text-muted-foreground">
            Master Daraja credentials used to initiate payments into every merchant till or
            paybill.
          </p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Merchants", value: stats?.merchantCount ?? 0 },
          { label: "Recent transactions", value: stats?.transactionCount ?? 0 },
          {
            label: "Settled volume (KES)",
            value: (stats?.volume ?? 0).toLocaleString(),
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="max-w-2xl rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Master Daraja credentials</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Used for every STK push. Merchants only supply their own shortcode; PayWave signs the
          requests with these.
        </p>

        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="env">Environment</Label>
            <Select
              value={environment}
              onValueChange={(v) => setEnvironment(v as "sandbox" | "production")}
            >
              <SelectTrigger id="env">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox</SelectItem>
                <SelectItem value="production">Production (live)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ck">Consumer key</Label>
            <Input id="ck" value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cs">Consumer secret</Label>
            <Input
              id="cs"
              type="password"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              placeholder={creds.data?.consumer_secret_masked ?? "Not set"}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="sc">Default shortcode</Label>
              <Input
                id="sc"
                value={shortcode}
                onChange={(e) => setShortcode(e.target.value)}
                placeholder="174379"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pk">Default passkey</Label>
              <Input
                id="pk"
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder={creds.data?.default_passkey_masked ?? "Not set"}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cb">Default callback URL</Label>
            <Input
              id="cb"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="https://your-app.lovable.app/api/public/stk/callback"
            />
          </div>

          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save master credentials"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Secrets are stored server-side and never returned to the browser — leave blank to keep
            the current value.
          </p>
        </form>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Merchants</h2>
        <ul className="mt-4 divide-y divide-border">
          {(overview.data?.merchants ?? []).map((m) => {
            const isAdmin = adminIds.includes(m.id);
            return (
              <li key={m.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m.business_name || m.email || m.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {isAdmin && <Badge variant="secondary">Super admin</Badge>}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={roleMutation.isPending}
                    onClick={() =>
                      roleMutation.mutate({ userId: m.id, makeAdmin: !isAdmin })
                    }
                  >
                    {isAdmin ? "Revoke admin" : "Make admin"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Platform transactions</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-2">Phone</th>
                <th className="py-2">Amount</th>
                <th className="py-2">Shortcode</th>
                <th className="py-2">Status</th>
                <th className="py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(overview.data?.transactions ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="py-2">{t.phone}</td>
                  <td className="py-2">KES {Number(t.amount).toLocaleString()}</td>
                  <td className="py-2">{t.shortcode ?? "—"}</td>
                  <td className="py-2">{t.status}</td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
