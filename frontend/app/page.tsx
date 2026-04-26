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
  Shield,
  Gauge,
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
    desc: "Lightning invoices (L402): pay in sats, preimage unlocks the run — no subscription wall.",
  },
  {
    icon: Layers,
    title: "Marketplace + builders",
    desc: "Live-style discovery, pinned builder agents, and clear pricing in sats before you commit.",
  },
  {
    icon: MessageSquare,
    title: "Agent chat",
    desc: "Auto-router or a dedicated thread against one agent address — answers in plain text.",
  },
];

const BENTO = [
  {
    title: "L402-native",
    body: "HTTP 402 challenges map cleanly to wallet flows — built for demos and production-minded MVPs.",
    icon: Shield,
    span: "md:col-span-2",
  },
  {
    title: "Fast path",
    body: "Next.js + Express: one UI origin, server-side `/backend` proxy, optional uAgent bridge in Docker.",
    icon: Gauge,
    span: "",
  },
  {
    title: "ASI1 & Agentverse",
    body: "Builders for copy, tech briefings, and images when keys are configured on the server.",
    icon: Sparkles,
    span: "",
  },
];

const PRODUCT_LINKS = [
  {
    href: "/marketplace",
    label: "Marketplace",
    blurb: "Search, filter, hire. Registry agents stay visible at the top.",
    icon: Store,
  },
  {
    href: "/agent-chat",
    label: "Agent chat",
    blurb: "Router or deep link with ?agentAddress= for paid runs.",
    icon: Bot,
  },
  {
    href: "/create-agent",
    label: "Create agent",
    blurb: "Describe a task; the backend registers a builder agent with L402 pricing.",
    icon: Sparkles,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#030303] text-[#fafafa]">
      <Navbar />

      <section className="relative overflow-hidden border-b border-[#1a1a1a]">
        <GridBackground />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.08),transparent)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
            <motion.p
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#0c0c0c] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] text-[#888888]"
            >
              <Zap className="h-3.5 w-3.5 text-[#f5f5f5]" />
              Lightning · agents · L402
            </motion.p>
            <motion.h1
              variants={fadeUp}
              className="mx-auto max-w-4xl font-mono text-[clamp(2rem,6vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.04em] text-[#ffffff]"
            >
              The agent layer
              <br />
              <span className="text-[#737373]">you pay in sats.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#9a9a9a] sm:text-[17px]"
            >
              ShotenX is a focused marketplace and chat surface for paid AI agents: invoices, optional Bitcoin
              Connect, and a monochrome UI built for clarity — ship demos without noise.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-12 flex flex-wrap justify-center gap-3">
              <Link
                href="/marketplace"
                className="group inline-flex items-center gap-2 rounded-sm border border-[#fafafa] bg-[#fafafa] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#030303] transition-all hover:bg-[#e5e5e5] active:scale-[0.98]"
              >
                Open marketplace
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/agent-chat"
                className="rounded-sm border border-[#3a3a3a] bg-transparent px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#b0b0b0] transition-colors hover:border-[#666666] hover:text-white"
              >
                Try agent chat
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-1.5 px-5 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#666666] hover:text-[#cccccc]"
              >
                Read docs
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <MarqueeStrip />

      <section className="border-b border-[#1a1a1a] bg-[#080808] py-16">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 sm:grid-cols-3">
          {[
            { k: "Model", v: "L402 + invoices", s: "Challenge → pay → execute. Replay-safe verification." },
            { k: "Output", v: "Plain & practical", s: "Readable text; images when the API returns data URLs." },
            { k: "Stack", v: "Next + Express", s: "Monorepo, Docker-ready, Render blueprint included." },
          ].map((row) => (
            <div key={row.k} className="text-center sm:text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#555555]">{row.k}</p>
              <p className="mt-3 font-mono text-lg font-semibold text-[#ffffff]">{row.v}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#777777]">{row.s}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-[#1a1a1a] bg-[#030303] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-[10px] uppercase tracking-[0.32em] text-[#555555]">
            Why teams try ShotenX
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#777777]">
            One surface for discovery, payment, and delivery — tuned for builders who care about UX and Lightning.
          </p>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="border border-[#1f1f1f] bg-[#0a0a0a] p-8 transition-colors hover:border-[#404040] hover:bg-[#0d0d0d]"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center border border-[#333333] text-[#ffffff]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="font-mono text-sm font-semibold tracking-tight text-[#ffffff]">{title}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-[#888888]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#1a1a1a] bg-[#080808] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-[10px] uppercase tracking-[0.32em] text-[#555555]">
            Architecture at a glance
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {BENTO.map(({ title, body, icon: Icon, span }) => (
              <div
                key={title}
                className={`border border-[#1f1f1f] bg-[#0a0a0a] p-7 ${span}`}
              >
                <Icon className="h-5 w-5 text-[#666666]" />
                <p className="mt-4 font-mono text-sm font-semibold text-[#ffffff]">{title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-[#888888]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#1a1a1a] bg-[#030303] py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-mono text-[10px] uppercase tracking-[0.32em] text-[#555555]">Explore</h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {PRODUCT_LINKS.map(({ href, label, blurb, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex flex-col border border-[#1f1f1f] bg-[#0a0a0a] p-8 transition-colors hover:border-[#404040]"
              >
                <Icon className="h-5 w-5 text-[#666666] transition-colors group-hover:text-[#ffffff]" />
                <p className="mt-5 font-mono text-sm font-semibold text-[#ffffff]">{label}</p>
                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-[#888888]">{blurb}</p>
                <span className="mt-6 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#666666] group-hover:text-[#ffffff]">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#1a1a1a] bg-[#080808] py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-mono text-[10px] uppercase tracking-[0.32em] text-[#555555]">
            Flow preview
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-[#777777]">
            Request → invoice → settle. Same rhythm as paid tools and agent runs.
          </p>
          <div className="mt-10">
            <Terminal lines={btcAgentSequence} autoPlay loop height={300} />
          </div>
        </div>
      </section>

      <section className="bg-[#030303] py-20 text-center">
        <h2 className="font-mono text-xl font-bold tracking-tight text-[#ffffff] sm:text-2xl">
          Ready for a paid run?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#888888]">
          Start in the marketplace or open agent chat. Use backend test mode when invoices are mocked.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href="/marketplace"
            className="rounded-sm bg-[#fafafa] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#030303] hover:bg-[#dddddd] active:scale-[0.98]"
          >
            Marketplace
          </Link>
          <Link
            href="/agent-chat"
            className="rounded-sm border border-[#444444] px-8 py-3.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-[#b0b0b0] hover:border-white hover:text-white"
          >
            Agent chat
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
