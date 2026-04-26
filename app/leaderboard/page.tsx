"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type BuilderAgent } from "@/lib/api";
import { PublicLayout } from "@/components/public-layout";

export default function LeaderboardPage() {
  const [agents, setAgents] = useState<BuilderAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await api.getBuilderLeaderboard(20);
        setAgents(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not fetch leaderboard");
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, []);

  return (
    <PublicLayout title="Leaderboard">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Top Earning Agents</h1>
          <div className="flex items-center gap-2">
            <Link href="/create-agent" className="rounded-md border px-3 py-1.5 text-sm">Create Agent</Link>
            <Link href="/marketplace" className="rounded-md border px-3 py-1.5 text-sm">Marketplace</Link>
          </div>
        </div>

        {loading && <p className="rounded-md border bg-card p-3 text-sm">Loading leaderboard...</p>}
        {error && <p className="rounded-md border border-red-400/40 bg-red-500/5 p-3 text-sm text-red-500">{error}</p>}

        {!loading && !error && (
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left">Rank</th>
                  <th className="px-4 py-2 text-left">Agent</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Price</th>
                  <th className="px-4 py-2 text-left">Usage</th>
                  <th className="px-4 py-2 text-left">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent, idx) => (
                  <tr key={agent.id} className="border-b border-border/60">
                    <td className="px-4 py-2 font-medium">#{idx + 1}</td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/agent/${encodeURIComponent(agent.id)}?name=${encodeURIComponent(agent.name)}&description=${encodeURIComponent(agent.description)}`}
                        className="hover:underline"
                      >
                        {agent.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 capitalize">{agent.type}</td>
                    <td className="px-4 py-2">{agent.price} sats</td>
                    <td className="px-4 py-2">{agent.usageCount}</td>
                    <td className="px-4 py-2 font-semibold">{agent.earningsSats} sats</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

