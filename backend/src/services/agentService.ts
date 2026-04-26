import { AgentListing } from "../types";
import { agentverseService } from "./agentverseService";

const cache = new Map<string, AgentListing>();

interface SearchParams {
  query?: string;
  sort?: "relevancy" | "created-at" | "last-modified" | "interactions";
  direction?: "asc" | "desc";
  offset?: number;
  limit?: number;
  searchId?: string;
}

export const agentService = {
  async list(params: SearchParams) {
    const response = await agentverseService.search({
      searchText: params.query,
      sort: params.sort,
      direction: params.direction,
      offset: params.offset,
      limit: params.limit,
      searchId: params.searchId
    });

    for (const item of response.agents) {
      if (item.id) {
        cache.set(item.id, item);
      }
    }
    return response;
  },

  byId(agentId: string) {
    return cache.get(agentId);
  }
};
