"use client";

import { useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";

const TRANSACTIONS = [
  { id: "srt_3PzQislHg7", customer: "Ryan Parker", amount: "$89.00", status: "Paid", method: "•••• 1090", desc: "Document Summarizer", date: "Feb 03, 2025 10:19 am", refunded: "—" },
  { id: "srt_3PzQislHg8", customer: "Emma Thompson", amount: "$149.00", status: "Paid", method: "•••• 2412", desc: "Code Reviewer", date: "Feb 03, 2025 10:19 am", refunded: "—" },
  { id: "srt_3PzQislHg9", customer: "Harper Butler", amount: "$90.00", status: "Paid", method: "•••• 1090", desc: "Sentiment Analyzer", date: "Feb 03, 2025 10:19 am", refunded: "—" },
  { id: "srt_5TjQyQzJk1", customer: "Benjamin Foster", amount: "$149.00", status: "Paid", method: "•••• 2412", desc: "Document Summarizer", date: "Feb 03, 2025 10:19 am", refunded: "—" },
  { id: "srt_5TjQyQzJk2", customer: "Liam Garcia", amount: "$110.00", status: "Refunded", method: "•••• 2345", desc: "Web Scraper", date: "Feb 03, 2025 10:19 am", refunded: "Feb 04, 2025 10:45..." },
  { id: "srt_2LpQz5QjK1", customer: "Ava Martinez", amount: "$130.00", status: "Paid", method: "•••• 6789", desc: "Image Captioner", date: "Feb 04, 2025 11:00 am", refunded: "—" },
  { id: "srt_4MkQhZxP1", customer: "Ethan Davis", amount: "$160.00", status: "Pending", method: "•••• 4321", desc: "Code Reviewer", date: "Feb 04, 2025 11:30 am", refunded: "—" },
  { id: "srt_6PzQhYxQk1", customer: "Chloe Hall", amount: "$95.00", status: "Paid", method: "•••• 2233", desc: "Currency Converter", date: "Feb 05, 2025 09:15 am", refunded: "—" },
  { id: "srt_8HgQz3TjK1", customer: "James Taylor", amount: "$175.00", status: "Paid", method: "•••• 9988", desc: "Document Summarizer", date: "Feb 05, 2025 09:45 am", refunded: "—" },
  { id: "srt_1QzTg8PjH1", customer: "Charlotte Anderson", amount: "$145.00", status: "Pending", method: "•••• 5567", desc: "Sentiment Analyzer", date: "Feb 05, 2025 10:15 am", refunded: "—" },
  { id: "srt_9YgQh2XjK1", customer: "Oliver Thomas", amount: "$90.00", status: "Paid", method: "•••• 1234", desc: "Web Scraper", date: "Feb 05, 2025 10:45 am", refunded: "—" },
  { id: "srt_3FkQz4YjK1", customer: "Amelia White", amount: "$130.00", status: "Paid", method: "•••• 7890", desc: "Image Captioner", date: "Feb 05, 2025 11:00 am", refunded: "—" },
  { id: "srt_4JkQh5KjL1", customer: "Henry Martin", amount: "$85.00", status: "Pending", method: "•••• 3456", desc: "Code Reviewer", date: "Feb 05, 2025 11:15 am", refunded: "—" },
  { id: "srt_7MnQp9RkL2", customer: "Sofia Lee", amount: "$200.00", status: "Paid", method: "•••• 8821", desc: "Document Summarizer", date: "Feb 06, 2025 09:00 am", refunded: "—" },
  { id: "srt_2BvQr6SkM3", customer: "Noah Wilson", amount: "$55.00", status: "Paid", method: "•••• 4412", desc: "Currency Converter", date: "Feb 06, 2025 10:30 am", refunded: "—" }
];

const STATUS_STYLE: Record<string, string> = {
  Paid: "badge-green",
  Refunded: "badge-blue",
  Pending: "badge-orange"
};

const STATS = [
  { label: "Succeeded", val: "1,280", change: "+56%", up: true },
  { label: "Refunded", val: "3", change: "+100%", up: false },
  { label: "Failed", val: "28", change: "+10%", up: false },
  { label: "Disputed", val: "0", change: "", up: true },
  { label: "Uncaptured", val: "0", change: "", up: true }
];

export default function TransactionsPage() {
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = statusFilter === "All"
    ? TRANSACTIONS
    : TRANSACTIONS.filter((t) => t.status === statusFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Transactions</h1>
        <div className="flex items-center gap-2">
          <button className="btn-outline flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button className="btn-outline flex items-center gap-1.5">
            Last 30 days ▾
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3">
        {STATS.map(({ label, val, change, up }) => (
          <div key={label} className="border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{val}</span>
              {change && (
                <span className={`text-xs font-medium ${up ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
                  {change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["All", "Paid", "Refunded", "Pending"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border ${
              statusFilter === s
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-3 w-3" /> {s}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button className="btn-outline">Analyze</button>
          <button className="btn-outline">Edit columns</button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-8 px-4 py-3"><input type="checkbox" className="h-3.5 w-3.5" /></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Payment method</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Refunded date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={t.id} className={`table-row-hover ${i < filtered.length - 1 ? "border-b border-border" : ""}`}>
                <td className="px-4 py-3"><input type="checkbox" className="h-3.5 w-3.5" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center bg-muted text-[10px] font-bold text-muted-foreground">
                      {t.customer[0]}
                    </div>
                    <span className="text-sm font-medium text-foreground">{t.customer}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-foreground">{t.amount}</td>
                <td className="px-4 py-3">
                  <span className={STATUS_STYLE[t.status]}>{t.status}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.method}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px]">{t.id.slice(0, 16)}...</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.date}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{t.refunded}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  <button className="text-xs hover:text-foreground">···</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">{filtered.length} of 1,280 results</p>
          <div className="flex gap-2">
            <button className="btn-outline">Prev</button>
            <button className="btn-outline">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
