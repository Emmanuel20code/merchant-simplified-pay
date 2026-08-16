import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { getAdminStatus, claimSuperAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Operator access — PayWave super admin" },
      {
        name: "description",
        content:
          "Restricted operator sign-in for the PayWave super admin console and master Daraja credentials.",
      },
      { property: "og:title", content: "PayWave operator access" },
      {
        property: "og:description",
        content: "Restricted sign-in for PayWave platform operators.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const fetchStatus = useServerFn(getAdminStatus);
  const claim = useServerFn(claimSuperAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  async function routeByRole() {
    const status = await fetchStatus();
    if (status.isAdmin) {
      navigate({ to: "/admin" });
      return;
    }
    if (!status.adminExists) {
      setCanClaim(true);
      toast.message("No super admin exists yet — you can claim the role.");
      return;
    }
    await supabase.auth.signOut();
    toast.error("This account does not have super admin access.");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin-login` },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created. Confirm your email, then sign in here.");
          setMode("signin");
          return;
        }
        await routeByRole();
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await routeByRole();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function onClaim() {
    setLoading(true);
    try {
      await claim();
      toast.success("You are now the PayWave super admin");
      navigate({ to: "/admin" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not claim");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <ShieldCheck className="size-6 text-primary" />
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
            {mode === "signin" ? "Operator access" : "Create operator account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restricted area. Super admin credentials only.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Operator email</Label>
              <Input
                id="admin-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Working…"
                : mode === "signin"
                  ? "Enter console"
                  : "Create operator account"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "No operator account yet? Create one"
              : "Already have an account? Sign in"}
          </button>

          {canClaim && (
            <Button
              variant="outline"
              className="mt-3 w-full"
              disabled={loading}
              onClick={onClaim}
            >
              Claim super admin
            </Button>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Merchant?{" "}
            <Link to="/auth" className="underline hover:text-foreground">
              Use the normal sign-in
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
