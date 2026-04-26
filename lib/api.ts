export interface Agent {
  id: string;
  name: string;
  description: string;
  avatarHref?: string;
  rating: number;
  interactions: number;
  category?: string;
  tags: string[];
  address: string;
  handle?: string;
  featured?: boolean;
  usageCount?: number;
  earningsSats?: number;
  priceSats?: number;
  trustScore?: number;
  trustTier?: "new" | "trusted" | "verified";
}

export interface SearchAgentsResponse {
  offset: number;
  limit: number;
  num_hits: number;
  total: number;
  search_id: string;
  agents: Agent[];
}

export interface SearchAnalytics {
  searchId: string;
  totalClicks: number;
  uniqueAgents: number;
  lastClickedAt?: string;
  byAgent: Record<string, number>;
}

export interface LlmAgentSuggestion {
  id: string;
  name: string;
  address: string;
  source: "fetch" | "openai" | "a2a";
  reason: string;
}

export interface BuilderAgent {
  id: string;
  name: string;
  description: string;
  type: "content" | "image" | "code";
  /** Backend-only preset for specialized templates (tech daily, ASI1 image). */
  preset?: "tech-daily" | "asi1-image";
  price: number;
  endpoint: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
  earningsSats: number;
  /** From builder reputation API when present (leaderboard / registry). */
  averageStars?: number;
}

export interface ReputationSummary {
  agentId: string;
  averageStars: number;
  ratingCount: number;
  reputationScore: number;
}

export interface WalletInfo {
  alias: string;
  balanceSats: number;
  mode: "test" | "alby-nwc";
}

export interface AutoAgentRunResponse {
  ok: boolean;
  mode: "auto-agent";
  selectedAgent: BuilderAgent;
  payment: { checkoutId: string; amountSats: number; status: string };
  result: { text?: string; summary?: string; imageUrl?: string; imageDataUrl?: string; review?: string; mode?: string };
}

export interface PaymentLog {
  id: string;
  checkoutId: string;
  requestPath: string;
  requestMethod: string;
  amountSats: number;
  status: "pending" | "settled" | "expired" | "consumed" | "failed";
  event: string;
  timestamp: string;
  detail?: string;
}

export interface Checkout {
  id: string;
  amountSats: number;
  invoice: string;
  paymentHash: string;
  status: "pending" | "settled" | "expired" | "consumed" | "failed";
}

/* ── tiny URL builder — replaces new URL() + searchParams boilerplate ── */
function url(path: string, params?: Record<string, string | number | undefined>): string {
  const base = `/backend${path}`;
  if (!params) return base;
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `${base}?${qs}` : base;
}

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const res = await fetch(url(path, params), { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<Response> {
  return fetch(url(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function postJson<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  const res = await post(path, body, headers);
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(payload.error ?? payload.message ?? `POST ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postRaw(path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await post(path, body, headers);
  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json() : {};
  return { status: res.status, ok: res.ok, payload };
}

/** Next.js App Router only — do not prefix `/backend` (Express has no this route). */
async function postRawSameOrigin(path: string, body?: unknown, headers?: Record<string, string>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const contentType = res.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
  return { status: res.status, ok: res.ok, payload };
}

async function postToolL402Raw(
  toolPath: "/summarize" | "/code-review",
  params: {
    prompt: string;
    buyerId?: string;
    authorization?: string;
    xPaymentToken?: string;
  }
) {
  const headers: Record<string, string> = {};
  if (params.authorization) headers.Authorization = params.authorization;
  if (params.xPaymentToken) headers["x-payment-token"] = params.xPaymentToken;
  return postRaw(
    `/api/tools${toolPath}`,
    { prompt: params.prompt, buyerId: params.buyerId ?? "demo-user" },
    Object.keys(headers).length ? headers : undefined
  );
}

export const api = {
  async searchAgents(params: {
    query?: string;
    sort?: "relevancy" | "created-at" | "last-modified" | "interactions";
    direction?: "asc" | "desc";
    offset?: number;
    limit?: number;
    searchId?: string;
  }): Promise<SearchAgentsResponse> {
    return get<SearchAgentsResponse>("/api/agents", {
      q: params.query,
      sort: params.sort,
      direction: params.direction,
      offset: params.offset,
      limit: params.limit,
      searchId: params.searchId,
    });
  },

  async sendClickFeedback(params: {
    searchId: string;
    agentAddress: string;
    position?: number;
    source?: string;
  }) {
    return postJson("/api/agents/feedback/click", params);
  },

  async getSearchAnalytics(searchId: string): Promise<SearchAnalytics> {
    return get<SearchAnalytics>(`/api/agents/analytics/${searchId}`);
  },

  async queryPaidAgent(params: {
    agentAddress: string;
    message: string;
    userId: string;
    authorization?: string;
  }) {
    return postRawSameOrigin(
      "/api/premium/agent-query",
      {
        agentAddress: params.agentAddress,
        message: params.message,
        userId: params.userId,
      },
      params.authorization ? { Authorization: params.authorization } : undefined
    );
  },

  async suggestAgentsByPrompt(query: string): Promise<LlmAgentSuggestion[]> {
    const res = await post("/api/agents/llm-search", { query });
    const contentType = res.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? ((await res.json().catch(() => ({}))) as { suggestions?: LlmAgentSuggestion[] })
      : {};
    if (!res.ok) return [];
    return (payload.suggestions ?? []).slice(0, 6);
  },

  async createBuilderAgent(params: { prompt: string; createdBy?: string; price?: number }): Promise<BuilderAgent> {
    const payload = await postJson<{ agent?: BuilderAgent; message?: string; error?: string }>("/api/agents/create-agent", params);
    if (!payload.agent) throw new Error(payload.message ?? payload.error ?? "Could not create agent");
    return payload.agent;
  },

  async listBuilderAgents(): Promise<BuilderAgent[]> {
    const payload = await get<{ agents?: BuilderAgent[] }>("/api/agents/registry/list");
    return payload.agents ?? [];
  },

  async getBuilderLeaderboard(limit = 10): Promise<BuilderAgent[]> {
    const payload = await get<{ agents?: BuilderAgent[] }>("/api/agents/leaderboard", { limit });
    return payload.agents ?? [];
  },

  async runBuilderAgent(params: { id: string; input: string; buyerId?: string; authorization?: string }) {
    return postRaw(`/api/agents/${params.id}/run`, {
      input: params.input,
      buyerId: params.buyerId ?? "web-user",
    }, params.authorization ? { Authorization: params.authorization } : undefined);
  },

  async autoRunSmartAgent(prompt: string, buyerId = "web-auto-user"): Promise<AutoAgentRunResponse> {
    return postJson<AutoAgentRunResponse>("/api/agents/auto-run", { prompt, buyerId });
  },

  async autoRunSmartAgentWithPayment(params: {
    prompt: string;
    buyerId?: string;
    checkoutId?: string;
    preimage?: string;
    agentId?: string;
  }) {
    /** Same-origin: ASI1 prompt guard + proxy to backend (no secrets in browser). */
    const res = await fetch("/api/smart-auto-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: params.prompt,
        buyerId: params.buyerId ?? "web-auto-user",
        checkoutId: params.checkoutId,
        preimage: params.preimage,
        agentId: params.agentId,
      }),
    });
    const contentType = res.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json") ? await res.json().catch(() => ({})) : {};
    return { status: res.status, ok: res.ok, payload };
  },

  async getPaymentLogs(limit = 50): Promise<PaymentLog[]> {
    const payload = await get<{ logs?: PaymentLog[] }>("/api/payments/logs/recent", { limit });
    return payload.logs ?? [];
  },

  /** Same-origin Next route → backend NWC balance (sidebar / wallet chip). */
  async getWalletInfo(): Promise<WalletInfo> {
    const res = await fetch("/api/alby/balance", { cache: "no-store" });
    const payload = (await res.json()) as {
      ok?: boolean;
      alias?: string;
      balanceSats?: number;
      mode?: string;
      error?: string;
    };
    if (!res.ok || payload.ok === false) {
      throw new Error(String(payload.error ?? "wallet_info_failed"));
    }
    const mode = payload.mode === "alby-nwc" ? "alby-nwc" : "test";
    return {
      alias: String(payload.alias ?? ""),
      balanceSats: Number(payload.balanceSats ?? 0),
      mode
    };
  },

  async getAgentReputation(agentId: string): Promise<ReputationSummary> {
    const path = `/api/agents/${encodeURIComponent(agentId)}/reputation`;
    const payload = await get<{ ok?: boolean; summary?: ReputationSummary }>(path);
    if (!payload.summary) {
      throw new Error("reputation_fetch_failed");
    }
    return payload.summary;
  },

  async submitAgentRating(params: {
    agentId: string;
    stars: number;
    raterId: string;
    comment?: string;
    checkoutId?: string;
  }): Promise<{ summary: ReputationSummary }> {
    const path = `/api/agents/${encodeURIComponent(params.agentId)}/rate`;
    const payload = await postJson<{ ok?: boolean; summary?: ReputationSummary; error?: string }>(path, {
      stars: params.stars,
      raterId: params.raterId,
      comment: params.comment,
      checkoutId: params.checkoutId
    });
    if (!payload.summary) {
      throw new Error(payload.error ?? "rating_submit_failed");
    }
    return { summary: payload.summary };
  },

  async createCheckout(agentId: string): Promise<Checkout> {
    return postJson<Checkout>("/api/payments/checkout", { agentId, buyerId: "dashboard-user", amountSats: 10 });
  },

  async settleCheckout(checkoutId: string): Promise<Checkout> {
    const payload = await postJson<{ checkout?: Checkout; error?: string }>(`/api/payments/${checkoutId}/agent-pay`);
    if (!payload.checkout) throw new Error(payload.error ?? "Could not settle checkout");
    return payload.checkout;
  },

  async summarizeWithL402(params: {
    prompt: string;
    buyerId?: string;
    authorization?: string;
    xPaymentToken?: string;
  }) {
    return postToolL402Raw("/summarize", params);
  },

  async postToolL402(
    toolPath: "/summarize" | "/code-review",
    params: {
      prompt: string;
      buyerId?: string;
      authorization?: string;
      xPaymentToken?: string;
    }
  ) {
    return postToolL402Raw(toolPath, params);
  },

  /** @deprecated Use summarizeWithL402 */
  async runPaidSummary(prompt: string, checkoutId?: string) {
    const res = await post(
      "/api/tools/summarize",
      { prompt, buyerId: "legacy-demo-user" },
      checkoutId ? { "x-payment-token": checkoutId } : undefined
    );
    const payload = (await res.json()) as Record<string, unknown>;
    if (res.status === 402) {
      const l402 = (payload.l402 ?? {}) as { checkoutId?: string };
      return { success: false, paywall: { checkoutId: String(l402.checkoutId ?? "") } };
    }
    if (!res.ok) return { success: false, error: String(payload.error ?? payload.message ?? "paid_summary_failed") };
    const result = (payload.result ?? {}) as { summary?: string };
    return { success: true, data: { summary: String(result.summary ?? "") } };
  },
};
