import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  KeyRound,
  Lock,
  RefreshCcw,
  ShieldCheck,
  Smartphone,
  Terminal,
  Webhook,
  Zap,
} from "lucide-react";

import heroImage from "@/assets/hero-stk.jpg";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PayWave — M-Pesa STK Push API for Developers" },
      {
        name: "description",
        content:
          "Generate an API key and start pushing M-Pesa payment prompts to your customers' phones. Money lands in your own till or paybill.",
      },
      { property: "og:title", content: "PayWave — M-Pesa STK Push API" },
      {
        property: "og:description",
        content:
          "One API key. Instant M-Pesa STK pushes to any till or paybill. Built on Safaricom Daraja.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: KeyRound,
    title: "One key, one endpoint",
    body: "Generate a scoped API key in the dashboard and call a single REST endpoint. No Daraja OAuth dance, no token caching.",
  },
  {
    icon: Smartphone,
    title: "Instant STK prompts",
    body: "Your customer gets the familiar M-Pesa PIN prompt on their handset in under two seconds, branded with your business name.",
  },
  {
    icon: Webhook,
    title: "Reliable callbacks",
    body: "Signed webhooks with automatic retries and idempotency keys, so a dropped response never turns into a double charge.",
  },
  {
    icon: ShieldCheck,
    title: "Credentials stay sealed",
    body: "Daraja consumer secrets and passkeys live encrypted on our side. Your app only ever holds a revocable PayWave key.",
  },
  {
    icon: BarChart3,
    title: "Live transaction ledger",
    body: "Every push, result code and receipt number in one searchable log. Reconcile against your statement in seconds.",
  },
  {
    icon: RefreshCcw,
    title: "Query, refund, repeat",
    body: "Status polling, timeout handling and reversal helpers ship with the API, not as a weekend project you have to build.",
  },
];

const steps = [
  {
    n: "01",
    title: "Create your account",
    body: "Sign up, add the till or paybill number that should receive funds, and confirm ownership.",
  },
  {
    n: "02",
    title: "Generate an API key",
    body: "Issue keys per environment or per app. Rotate or revoke any of them instantly without redeploying.",
  },
  {
    n: "03",
    title: "Fire your first push",
    body: "One POST request sends the prompt. We handle Daraja auth, the callback, and the receipt.",
  },
];

const codeSample = `curl -X POST https://api.paywave.co.ke/v1/stk/push \\
  -H "Authorization: Bearer pw_live_9f3c...b21" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "254712345678",
    "amount": 1500,
    "reference": "INV-10482",
    "description": "Order #10482",
    "callback_url": "https://yourapp.com/hooks/paywave"
  }'`;

const plans = [
  {
    name: "Starter",
    price: "Free",
    note: "First 100 transactions each month",
    features: ["1 API key", "STK push + callbacks", "7-day transaction log", "Community support"],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Growth",
    price: "KES 2,900",
    note: "per month + 0.8% per transaction",
    features: [
      "Unlimited API keys",
      "Signed webhooks & retries",
      "12-month transaction log",
      "Status & reversal endpoints",
      "Email support in 4 hours",
    ],
    cta: "Choose Growth",
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    note: "For high-volume merchants",
    features: [
      "Volume pricing",
      "Dedicated throughput",
      "Multiple tills & paybills",
      "99.95% uptime SLA",
      "Slack channel support",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

const faqs = [
  {
    q: "Do I need my own Daraja account?",
    a: "No. PayWave runs on production Daraja credentials that we manage and monitor. You only bring the till or paybill number that should be credited.",
  },
  {
    q: "How fast does the prompt reach the customer?",
    a: "Typically 1–3 seconds after your API call, depending on Safaricom network conditions. We surface the exact latency for every request in your log.",
  },
  {
    q: "What happens if a customer ignores the prompt?",
    a: "The push times out after about 60 seconds and we send a callback with a timeout result code, so your checkout can fail gracefully or retry.",
  },
  {
    q: "Which languages do you support?",
    a: "Any language that can make an HTTPS request. We publish copy-paste snippets for Node.js, PHP, Python, Laravel, Django and Flutter.",
  },
  {
    q: "Can I revoke a leaked key?",
    a: "Yes, instantly. Keys are independent, so revoking one never affects your other apps or environments.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[image:var(--gradient-accent)]">
              <Zap className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">PayWave</span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">Get API key</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden bg-hero-glow">
          <div className="absolute inset-0 grid-lines opacity-60" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 md:py-28 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-ring" />
                Live on Safaricom Daraja production
              </span>
              <h1 className="mt-6 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
                M-Pesa STK push,
                <br />
                <span className="text-gradient">one API key away</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
                PayWave turns weeks of Daraja integration into a single POST request. Generate a
                key, drop it into your software, and prompt customers to pay straight into your till
                or paybill.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button variant="hero" size="xl" asChild>
                  <Link to="/auth">
                    Generate your API key
                    <ArrowRight />
                  </Link>
                </Button>
                <Button variant="glass" size="xl">
                  <Terminal />
                  Read the docs
                </Button>
              </div>
              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-border/60 pt-8">
                {[
                  ["1.8s", "Median prompt time"],
                  ["99.95%", "API uptime"],
                  ["5 min", "To first payment"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <dt className="font-display text-2xl font-bold text-foreground">{value}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="relative animate-float">
              <img
                src={heroImage}
                alt="Smartphone showing an M-Pesa STK push payment prompt connected to API services"
                width={1280}
                height={1280}
                className="w-full rounded-3xl border border-border/70 shadow-[var(--shadow-panel)]"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-5 py-24">
          <div className="max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Platform</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              Everything Daraja makes hard, already solved
            </h2>
            <p className="mt-4 text-muted-foreground">
              We built the boring parts once, so your checkout ships this week instead of next
              quarter.
            </p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <article
                key={f.title}
                className="panel group p-7 transition-colors hover:border-primary/40"
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/20">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-y border-border/60 bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-24 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
                How it works
              </p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Three steps to live payments</h2>
              <ol className="mt-10 space-y-8">
                {steps.map((s) => (
                  <li key={s.n} className="flex gap-5">
                    <span className="font-mono text-sm font-medium text-primary">{s.n}</span>
                    <div className="border-l border-border pl-5">
                      <h3 className="text-lg font-semibold">{s.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="panel overflow-hidden shadow-[var(--shadow-panel)]">
              <div className="flex items-center gap-2 border-b border-border/70 bg-surface/60 px-5 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-chart-4/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">stk-push.sh</span>
              </div>
              <pre className="overflow-x-auto px-5 py-6 font-mono text-[0.78rem] leading-relaxed text-muted-foreground">
                <code>{codeSample}</code>
              </pre>
              <div className="border-t border-border/70 bg-surface/40 px-5 py-4">
                <p className="font-mono text-[0.78rem] text-primary">
                  {"→ 200 OK  {\"status\":\"pending\",\"checkout_id\":\"ws_CO_1842\"}"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Pricing</p>
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Pay for what you collect</h2>
            <p className="mt-4 text-muted-foreground">
              No setup fees, no lock-in. Start on the free tier and upgrade when volume arrives.
            </p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((p) => (
              <article
                key={p.name}
                className={`panel relative flex flex-col p-8 ${
                  p.featured ? "border-primary/50 shadow-[var(--shadow-glow)]" : ""
                }`}
              >
                {p.featured ? (
                  <span className="absolute -top-3 left-8 rounded-full bg-[image:var(--gradient-accent)] px-3 py-1 text-[0.7rem] font-semibold text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {p.name}
                </h3>
                <p className="mt-4 font-display text-4xl font-bold">{p.price}</p>
                <p className="mt-2 text-sm text-muted-foreground">{p.note}</p>
                <ul className="mt-7 flex-1 space-y-3 text-sm">
                  {p.features.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={p.featured ? "hero" : "glass"}
                  size="lg"
                  className="mt-8 w-full"
                >
                  {p.cta}
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border/60 bg-card/40">
          <div className="mx-auto max-w-3xl px-5 py-24">
            <h2 className="text-center text-3xl font-bold sm:text-4xl">Questions, answered</h2>
            <Accordion type="single" collapsible className="mt-10">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q} className="border-border/70">
                  <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden bg-hero-glow">
          <div className="absolute inset-0 grid-lines opacity-50" aria-hidden="true" />
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              Your first STK push is <span className="text-gradient">five minutes away</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Create an account, generate a key, and start collecting M-Pesa payments from inside
              your own software today.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/auth">
                  Get started free
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="glass" size="xl">
                Book a walkthrough
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[image:var(--gradient-accent)]">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
            </span>
            <span className="font-display font-semibold text-foreground">PayWave</span>
          </div>
          <p>© {new Date().getFullYear()} PayWave. Payments powered by Safaricom Daraja.</p>
        </div>
      </footer>

      {/* Hidden super admin entrance */}
      <Link
        to="/admin-login"
        aria-label="Super admin"
        title=""
        className="group fixed bottom-4 right-4 z-50 flex h-9 w-9 items-center justify-center rounded-full opacity-0 transition-opacity duration-300 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
      >
        <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
      </Link>
    </div>
  );
}
