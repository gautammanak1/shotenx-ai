import { AgentListing, AgentSearchResponse } from "../types";

const baseUrl = process.env.AGENTVERSE_BASE_URL ?? "https://agentverse.ai";
const apiKey = process.env.AGENTVERSE_API_KEY ?? "";

const toListing = (agent: Record<string, unknown>): AgentListing => ({
  id:
    String(agent.address ?? "") ||
    String(agent.handle ?? "") ||
    String(agent.name ?? ""),
  name: String(agent.name ?? "Unknown agent"),
  description: String(agent.description ?? ""),
  avatarHref: String(agent.avatar_href ?? ""),
  rating: Number(agent.rating ?? 0),
  interactions: Number(agent.total_interactions ?? 0),
  category: String(agent.category ?? ""),
  tags: Array.isArray(agent.system_wide_tags)
    ? agent.system_wide_tags.map(String)
    : [],
  address: String(agent.address ?? ""),
  handle: String(agent.handle ?? ""),
  featured: Boolean(agent.featured ?? false),
  owner: String(agent.owner ?? "")
});

export const agentverseService = {
  async search(params: {
    searchText?: string;
    sort?: "relevancy" | "created-at" | "last-modified" | "interactions";
    direction?: "asc" | "desc";
    semanticSearch?: boolean;
    offset?: number;
    limit?: number;
    searchId?: string;
  }): Promise<AgentSearchResponse> {
    const payload = {
      search_text: params.searchText?.trim() || undefined,
      sort: params.sort ?? "relevancy",
      direction: params.direction ?? "desc",
      semantic_search: params.semanticSearch ?? true,
      offset: params.offset ?? 0,
      limit: params.limit ?? 30,
      search_id: params.searchId || undefined,
      source: "shotenx-ai"
    };

    const response = await fetch(`${baseUrl}/v1/search/agents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Agentverse search failed (${response.status}): ${errorText || "unknown"}`
      );
    }

    const data = (await response.json()) as Record<string, unknown>;
    const items = Array.isArray(data.agents)
      ? data.agents.map((entry) => toListing(entry as Record<string, unknown>))
      : [];

    return {
      offset: Number(data.offset ?? payload.offset),
      limit: Number(data.limit ?? payload.limit),
      num_hits: Number(data.num_hits ?? items.length),
      total: Number(data.total ?? items.length),
      search_id: String(data.search_id ?? ""),
      agents: items
    };
  },

  async sendClickFeedback(params: {
    searchId: string;
    agentAddress: string;
    source?: string;
    position?: number;
  }) {
    const payload = {
      type: "click",
      search_id: params.searchId,
      agent_address: params.agentAddress,
      source: params.source ?? "shotenx-ai",
      position: params.position
    };

    const response = await fetch(`${baseUrl}/v1/search/feedback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Agentverse feedback failed (${response.status}): ${errorText || "unknown"}`
      );
    }

    return response.json().catch(() => ({ ok: true }));
  }
};
