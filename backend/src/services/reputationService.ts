import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export type RatingEntry = {
  id: string;
  agentId: string;
  raterId: string;
  stars: number;
  comment?: string;
  checkoutId?: string;
  createdAt: string;
};

export type ReputationSummary = {
  agentId: string;
  averageStars: number;
  ratingCount: number;
  reputationScore: number;
};

type RatingsFile = {
  ratings: RatingEntry[];
};

const DB_PATH =
  process.env.RATINGS_DB_PATH?.trim() ||
  path.resolve(process.cwd(), "data", "ratings.json");

let cache: RatingsFile | null = null;

const empty = (): RatingsFile => ({ ratings: [] });

const load = (): RatingsFile => {
  if (cache) return cache;

  const dir = path.dirname(DB_PATH);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(DB_PATH)) {
    cache = empty();
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), "utf8");
    return cache;
  }

  const raw = fs.readFileSync(DB_PATH, "utf8").trim();
  if (!raw) {
    cache = empty();
    return cache;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RatingsFile>;
    cache = { ratings: Array.isArray(parsed.ratings) ? parsed.ratings : [] };
  } catch {
    cache = empty();
  }

  return cache!;
};

const persist = () => {
  if (!cache) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2), "utf8");
};

const summaryForRatings = (agentId: string, list: RatingEntry[]): ReputationSummary => {
  if (list.length === 0) {
    return { agentId, averageStars: 0, ratingCount: 0, reputationScore: 0 };
  }
  const sum = list.reduce((acc, r) => acc + r.stars, 0);
  const averageStars = Math.round((sum / list.length) * 100) / 100;
  const ratingCount = list.length;
  const reputationScore =
    Math.round(averageStars * Math.sqrt(ratingCount + 1) * 10 * 100) / 100;
  return { agentId, averageStars, ratingCount, reputationScore };
};

export const reputationService = {
  submitRating(params: {
    agentId: string;
    raterId: string;
    stars: number;
    comment?: string;
    checkoutId?: string;
  }): RatingEntry {
    const store = load();
    if (params.checkoutId) {
      const dup = store.ratings.some(
        (r) =>
          r.agentId === params.agentId &&
          r.checkoutId &&
          r.checkoutId === params.checkoutId
      );
      if (dup) {
        throw new Error("checkout_already_rated");
      }
    }

    const entry: RatingEntry = {
      id: randomUUID(),
      agentId: params.agentId,
      raterId: params.raterId,
      stars: params.stars,
      comment: params.comment,
      checkoutId: params.checkoutId,
      createdAt: new Date().toISOString()
    };

    store.ratings.push(entry);
    if (store.ratings.length > 50_000) {
      store.ratings = store.ratings.slice(-50_000);
    }
    persist();
    return entry;
  },

  getSummary(agentId: string): ReputationSummary {
    const store = load();
    const list = store.ratings.filter((r) => r.agentId === agentId);
    return summaryForRatings(agentId, list);
  },

  getSummaries(agentIds: string[]): Record<string, ReputationSummary> {
    const store = load();
    const out: Record<string, ReputationSummary> = {};
    for (const id of agentIds) {
      const list = store.ratings.filter((r) => r.agentId === id);
      out[id] = summaryForRatings(id, list);
    }
    return out;
  },

  listRatingsForAgent(agentId: string, limit: number): RatingEntry[] {
    const store = load();
    const list = store.ratings
      .filter((r) => r.agentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list.slice(0, Math.max(1, limit));
  }
};
