"use client";

import { useState } from "react";
import { ChevronDown, Zap, MessageCircle, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

const FAQS = [
  { q: "How do I make my first API call?", a: "Call any endpoint listed in the Marketplace. You'll receive an HTTP 402 response with a Lightning invoice. Pay it with any L402-compatible wallet (like Alby), then retry the request with the x-payment-token header." },
  { q: "Do I need an account to use agents?", a: "No account is needed to browse the marketplace or make payments. The dashboard account is only for providers who want to register and manage their own APIs." },
  { q: "What wallets are supported?", a: "Any Lightning wallet that supports L402 works — Alby is recommended for browser-based agents. You can also use any node with LNC (Lightning Node Connect)." },
  { q: "How do I register my own API?", a: "Go to Register API in the sidebar. Fill in your service details, set a price in sats, and add your Lightning wallet address (e.g. you@getalby.com). Your API will be live in the catalog immediately." },
  { q: "What is the minimum payment amount?", a: "There is no minimum. Payments can be as low as 1 sat (~$0.0003). Most services range from 10–100 sats per call." },
  { q: "How fast are payments settled?", a: "Lightning payments settle in under 1 second. The full flow — request, invoice, payment, result — completes in under 1 second on average." },
  { q: "What happens if a payment expires?", a: "Lightning invoices expire after a set time (usually 1 hour). If yours expires, simply create a new checkout and pay the fresh invoice." },
  { q: "How are providers verified?", a: "All providers go through a manual verification process before their API is listed. Reputation scores are tracked on every call and visible to all agents." },
];

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-foreground">{q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Help Center</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Find answers, guides, and support resources.</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpen,      label: "Read the Docs",    desc: "Full API reference",         href: "/docs" },
          { icon: Zap,           label: "Live Demo",        desc: "See L402 in action",         href: "/demo" },
          { icon: MessageCircle, label: "Contact Support",  desc: "Get help from the team",     href: "mailto:support@shotenx.ai" },
        ].map(({ icon: Icon, label, desc, href }) => (
          <Link key={label} href={href}
            className="border border-border bg-card p-4 hover:border-blue-500/40 transition-colors flex flex-col gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-blue-600/10">
              <Icon className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </Link>
        ))}
      </div>

      {/* FAQs */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Frequently Asked Questions</h2>
        <div className="space-y-1.5">
          {FAQS.map((f) => <FAQ key={f.q} {...f} />)}
        </div>
      </div>

      {/* Common issues */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Common Issues</h2>
        <div className="space-y-2">
          {[
            { issue: "Getting HTTP 402 on every request", fix: "This is expected — pay the Lightning invoice returned in the response body, then retry with x-payment-token header." },
            { issue: "Payment token not working", fix: "Tokens are single-use and tied to one request. Create a new checkout for each call." },
            { issue: "Invoice expired before payment", fix: "Lightning invoices expire after ~1 hour. Create a fresh checkout and pay immediately." },
            { issue: "Backend offline error in dashboard", fix: "The backend at localhost:8080 is not running. Start your backend server or check NEXT_PUBLIC_BACKEND_URL in .env." },
          ].map(({ issue, fix }) => (
            <div key={issue} className="border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">{issue}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{fix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="border border-border bg-card p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Still need help?</p>
          <p className="text-xs text-muted-foreground mt-0.5">Reach out and we'll get back to you within 24 hours.</p>
        </div>
        <a href="mailto:support@shotenx.ai"
          className="flex items-center gap-1.5 bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors">
          Email support <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
