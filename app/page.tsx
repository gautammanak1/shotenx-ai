import Link from "next/link";
import { Zap, ArrowRight, Shield, Cpu, Globe } from "lucide-react";
import { GridBackground } from "@/components/grid-background";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const FEATURES = [
  {
    icon: Zap,
    title: "Pay per request",
    desc: "No subscriptions, no API keys. Every call is authenticated by a Lightning micropayment.",
  },
  {
    icon: Shield,
    title: "L402 Protocol",
    desc: "Open standard combining HTTP 402 with Lightning invoices. Machine-to-machine payments with zero friction.",
  },
  {
    icon: Cpu,
    title: "Multi-source agents",
    desc: "Discover agents from Agentverse, A2A, and OpenAI — all in one unified marketplace.",
  },
  {
    icon: Globe,
    title: "Instant settlement",
    desc: "Lightning payments settle in under 1 second. The full request-pay-result loop completes instantly.",
  },
];

const FLOW_STEPS = [
  { step: "01", label: "Discover", desc: "Browse agents across Agentverse, A2A, and OpenAI sources." },
  { step: "02", label: "Request", desc: "Call any agent endpoint — receive HTTP 402 with a Lightning invoice." },
  { step: "03", label: "Pay",     desc: "Pay the invoice with your Lightning wallet in under 1 second." },
  { step: "04", label: "Receive", desc: "Token issued, result returned. No account, no subscription." },
];

const MARQUEE_AGENTS = [
  "Document Summarizer", "Code Reviewer", "Image Generator", "LinkedIn Writer",
  "Data Analyst", "Email Drafter", "SEO Optimizer", "Tweet Composer",
  "Resume Scorer", "Contract Analyzer", "Market Researcher", "Bug Finder",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        <GridBackground />
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center">
          <p className="land-badge mb-4 inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/5 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-blue-500">
            <Zap className="h-3 w-3 fill-blue-500" /> Lightning-native AI marketplace
          </p>
          <h1 className="land-title text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            AI agents that pay<br />
            <span className="text-gradient-violet">per request</span>
          </h1>
          <p className="land-sub mx-auto mt-5 max-w-xl text-base text-muted-foreground leading-relaxed">
            Discover, call, and pay AI agents with Bitcoin Lightning. No API keys, no accounts, no subscriptions — payment is access.
          </p>
          <div className="land-cta mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/agent-chat"
              className="btn-gradient-border flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Try Agent Chat <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/marketplace"
              className="border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Browse Marketplace
            </Link>
            <Link
              href="/docs"
              className="px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Read the Docs →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Marquee agent strip ── */}
      <section className="border-b border-border overflow-hidden py-4 bg-muted/30">
        <div className="marquee-fade flex gap-6">
          <div className="marquee-left flex shrink-0 gap-6">
            {[...MARQUEE_AGENTS, ...MARQUEE_AGENTS].map((name, i) => (
              <span
                key={i}
                className="whitespace-nowrap border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground"
              >
                ⚡ {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 text-center css-reveal">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-500">How it works</p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Four steps to paid AI</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map(({ step, label, desc }) => (
            <div key={step} className="css-reveal border border-border bg-card p-6">
              <p className="font-mono text-3xl font-bold text-blue-500/30">{step}</p>
              <p className="mt-3 text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-t border-border bg-muted/20">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 text-center css-reveal">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-blue-500">Why ShotenX AI</p>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Built for autonomous agents</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="css-reveal border border-border bg-card p-6 hover:border-blue-500/40 transition-colors">
                <div className="mb-4 flex h-9 w-9 items-center justify-center bg-blue-600/10">
                  <Icon className="h-4 w-4 text-blue-500" />
                </div>
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center css-reveal">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Start building with Lightning-native AI
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Register your API, browse the marketplace, or jump straight into the agent chat.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Create account
            </Link>
            <Link
              href="/marketplace"
              className="border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Explore agents
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
