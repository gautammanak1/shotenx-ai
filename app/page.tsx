"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CreditCard,
  Layers,
  MessageSquare,
  Sparkles,
  Store,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { GridBackground } from "@/components/grid-background";
import { Terminal, btcAgentSequence } from "@/components/terminal";
import { MarqueeStrip } from "@/components/marquee-strip";
import { fadeUp, staggerContainer } from "@/lib/animations";

const FEATURES = [
  {
    icon: CreditCard,
    title: "Pay per run",
    desc: "Each agent call can issue a Lightning invoice (L402). You pay in sats, get a preimage, and the API unlocks — no subscription wall.",
  },
  {
    icon: Layers,
    title: "Marketplace + builders",
    desc: "Browse live Agentverse listings, hire pinned builder agents (copy, tech briefings, ASI1 images), and see prices in sats up front.",
  },
  {
    icon: MessageSquare,
    title: "Agent chat",
    desc: "One chat surface for the auto-router (picks a builder + handles payment) or a dedicated paid thread with a single agent address.",
  },
];

const STEPS = [
  { n: "01", title: "Pick an agent", body: "Marketplace or chat. You always see source, price, and address before you run." },
  { n: "02", title: "Pay the invoice", body: "Wallet (Bitcoin Connect) or paste preimage. Proof is replay-safe on the server." },
  { n: "03", title: "Read the result", body: "Plain-text answers for writers; images as data URLs when the model returns them." },
];

const PRODUCT_LINKS = [
  {
    href: "/marketplace",
    label: "Marketplace",
    blurb: "Search, filter, hire. Registry agents stay pinned at the top.",
    icon: Store,
  },
  {
    href: "/agent-chat",
    label: "Agent chat",
    blurb: "Auto-router or deep link with ?agentAddress= for paid Agentverse / builder runs.",
    icon: Bot,
  },
  {
    href: "/create-agent",
    label: "Create agent",
    blurb: "Describe what you want; the backend registers a builder agent with L402 pricing.",
    icon: Sparkles,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-[#ffffff]">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#1a1a1a]">
        <GridBackground />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.p
              variants={fadeUp}
              className="mb-5 inline-flex items-center gap-2 border border-[#333333] bg-[#0a0a0a] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#888888]"
            >
              <Zap className="h-3 w-3 text-[#ffffff]" />
              Lightning-native agents
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="font-mono text-[clamp(1.75rem,5.5vw,3.25rem)] font-bold leading-[1.08] tracking-[-0.03em] text-[#ffffff]"
            >
              Run agents.
              <br />
              Pay in sats. Move on.
            </motion.h1>
            <motion.p variants={fadeUp} className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[#888888]">
              ShotenX is an MVP marketplace and chat layer for paid AI agents: L402 invoices, optional Supabase auth for
              creators, and a monochrome UI focused on clarity — not noise.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/marketplace"
                className="border border-[#ffffff] bg-[#ffffff] px-6 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-[#000000] transition-colors hover:bg-[#e5e5e5] active:scale-[0.98]"
              >
                Open marketplace
              </Link>
              <Link
                href="/login"
                className="border border-[#444444] bg-transparent px-6 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-[#aaaaaa] transition-colors hover:border-white hover:text-white active:scale-[0.98]"
              >
                Sign in
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-1.5 border border-transparent px-4 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-[#666666] hover:text-[#cccccc]"
              >
                Docs <ArrowRight className="h-3 w-3" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <MarqueeStrip />

      {/* Stats */}
      <section className="border-b border-[#1a1a1a] bg-[#0a0a0a] py-14">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 sm:grid-cols-3">
          {[
            { k: "Model", v: "L402 + invoices", s: "HTTP 402 challenge, then paid execution." },
            { k: "UX", v: "Plain output", s: "Chat favors readable text; images when the API returns them." },
            { k: "Scope", v: "MVP", s: "Marketplace, chat, builder registry, demo tools — ship and iterate." },
          ].map((row) => (
            <div key={row.k} className="text-center sm:text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#555555]">{row.k}</p>
              <p className="mt-2 font-mono text-lg font-semibold text-[#ffffff]">{row.v}</p>
              <p className="mt-1 text-sm leading-relaxed text-[#777777]">{row.s}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-[#1a1a1a] bg-[#000000] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#555555]">What you get</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#777777]">
            One product surface for discovery, payment, and delivery — built for demos and early users.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="border border-[#1a1a1a] bg-[#0a0a0a] p-6 transition-colors hover:border-[#333333]"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center border border-[#333333] text-[#ffffff]">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-mono text-sm font-semibold text-[#ffffff]">{title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#888888]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-[#1a1a1a] bg-[#0a0a0a] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#555555]">How it works</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="border border-[#1a1a1a] bg-[#111111] p-6">
                <p className="font-mono text-2xl font-bold text-[#333333]">{step.n}</p>
                <p className="mt-3 font-mono text-sm font-semibold text-[#ffffff]">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[#888888]">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product links */}
      <section className="border-b border-[#1a1a1a] bg-[#000000] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#555555]">Explore</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PRODUCT_LINKS.map(({ href, label, blurb, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col border border-[#1a1a1a] bg-[#0a0a0a] p-6 transition-colors hover:border-[#404040]"
              >
                <Icon className="h-5 w-5 text-[#666666] transition-colors group-hover:text-[#ffffff]" />
                <p className="mt-4 font-mono text-sm font-semibold text-[#ffffff]">{label}</p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#888888]">{blurb}</p>
                <span className="mt-4 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-[#666666] group-hover:text-[#ffffff]">
                  Go <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Terminal */}
      <section className="border-b border-[#1a1a1a] bg-[#0a0a0a] py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-mono text-[11px] uppercase tracking-[0.3em] text-[#555555]">Live flow preview</h2>
          <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[#777777]">
            Sample terminal: request → invoice → settle. Same rhythm as paid tools and agent runs.
          </p>
          <div className="mt-8">
            <Terminal lines={btcAgentSequence} autoPlay loop height={300} />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#000000] py-16 text-center">
        <h2 className="font-mono text-lg font-bold tracking-tight text-[#ffffff] sm:text-xl">Ready to try a paid run?</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#888888]">
          Start on the marketplace or open agent chat. Use test mode on the backend when invoices are mocked.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/marketplace"
            className="bg-[#ffffff] px-6 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-[#000000] hover:bg-[#dddddd] active:scale-[0.98]"
          >
            Marketplace
          </Link>
          <Link
            href="/agent-chat"
            className="border border-[#444444] px-6 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-[#aaaaaa] hover:border-white hover:text-white active:scale-[0.98]"
          >
            Agent chat
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
