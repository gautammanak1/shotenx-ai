import { SearchAnalyticsSnapshot } from "../types";

interface SearchAnalyticsState {
  totalClicks: number;
  lastClickedAt?: string;
  byAgent: Map<string, number>;
}

const store = new Map<string, SearchAnalyticsState>();

export const searchAnalyticsService = {
  recordClick(searchId: string, agentAddress: string) {
    if (!searchId || !agentAddress) return;

    const current = store.get(searchId) ?? {
      totalClicks: 0,
      byAgent: new Map<string, number>()
    };

    current.totalClicks += 1;
    current.lastClickedAt = new Date().toISOString();
    current.byAgent.set(agentAddress, (current.byAgent.get(agentAddress) ?? 0) + 1);

    store.set(searchId, current);
  },

  getSnapshot(searchId: string): SearchAnalyticsSnapshot {
    const current = store.get(searchId);
    if (!current) {
      return {
        searchId,
        totalClicks: 0,
        uniqueAgents: 0,
        byAgent: {}
      };
    }

    const byAgent: Record<string, number> = {};
    for (const [agentAddress, count] of current.byAgent.entries()) {
      byAgent[agentAddress] = count;
    }

    return {
      searchId,
      totalClicks: current.totalClicks,
      uniqueAgents: current.byAgent.size,
      lastClickedAt: current.lastClickedAt,
      byAgent
    };
  }
};
