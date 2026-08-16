import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/keys")({
  head: () => ({
    meta: [
      { title: "API keys — PayWave" },
      {
        name: "description",
        content:
          "Create and revoke PayWave API keys used to trigger M-Pesa STK pushes from your own backend.",
      },
      { property: "og:title", content: "API keys — PayWave" },
      {
        property: "og:description",
        content: "Manage the keys that authorise M-Pesa STK push requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KeysPage,
});

function KeysPage() {
  const queryClient = useQueryClient();
  const fetchKeys = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);

  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const keys = useQuery({ queryKey: ["api-keys"], queryFn: () => fetchKeys() });

  const createMutation = useMutation({
    mutationFn: () => create({ data: { name: name || "Default key" } }),
    onSuccess: (result) => {
      setFreshKey(result.key);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create key"),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revoke({ data: { id } }),
    onSuccess: () => {
      toast.success("Key revoked");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });

  return (
    <div className="max-w-3xl space-y-8">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">API keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Use a key to call the STK push endpoint from your own server.
        </p>

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-2">
            <Label htmlFor="keyname">Key name</Label>
            <Input
              id="keyname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Production server"
            />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            Create key
          </Button>
        </div>

        {freshKey && (
          <div className="mt-5 rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-medium text-foreground">
              Copy this key now — it won't be shown again.
            </p>
            <code className="mt-2 block break-all rounded bg-background p-3 text-sm">
              {freshKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                navigator.clipboard.writeText(freshKey);
                toast.success("Copied");
              }}
            >
              Copy
            </Button>
          </div>
        )}

        <ul className="mt-6 divide-y divide-border">
          {(keys.data ?? []).map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{key.name}</p>
                <p className="text-xs text-muted-foreground">
                  {key.key_prefix}••••• ·{" "}
                  {key.revoked_at ? "revoked" : `created ${new Date(key.created_at).toLocaleDateString()}`}
                </p>
              </div>
              {!key.revoked_at && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeMutation.mutate(key.id)}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Trigger a push from your code</h2>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-relaxed text-foreground">
{`curl -X POST https://your-app.lovable.app/api/public/stk/push \\
  -H "Authorization: Bearer pw_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"0712345678","amount":500,"accountReference":"INV-1042"}'`}
        </pre>
      </section>
    </div>
  );
}