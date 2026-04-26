import { Router, type Request } from "express";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { agentService } from "../services/agentService";
import { agentverseService } from "../services/agentverseService";
import { searchAnalyticsService } from "../services/searchAnalyticsService";
import { builderAgentEngine } from "../agents/engine";
import { l402Paywall } from "../middleware/l402Paywall";
import { paymentService } from "../services/paymentService";
import { reputationService } from "../services/reputationService";
import { createRateLimiter } from "../middleware/rateLimiter";
import { runLlmAgentSearch } from "../services/llmAgentSearchService";
import { normalizeAgentError, queryUAgentDirect } from "../services/uagentDirectService";

export const agentRoutes = Router();

// Rate limit monetized routes per buyer/IP. Per `.cursor/rules/payments.mdc`
// these tiers protect against scraping and replay storms while leaving plenty
// of room for the auto-router demo (10 req / 60s = comfortable for judging).
const autoRunRateLimit = createRateLimiter({
  scope: "auto-run",
  capacity: Number(process.env.AUTORUN_RATE_LIMIT ?? 10),
  windowMs: 60_000
});
const builderRunRateLimit = createRateLimiter({
  scope: "builder-run",
  capacity: Number(process.env.BUILDER_RUN_RATE_LIMIT ?? 20),
  windowMs: 60_000
});
const ratingRateLimit = createRateLimiter({
  scope: "rate-agent",
  capacity: Number(process.env.RATING_RATE_LIMIT ?? 5),
  windowMs: 60_000
});

const clickSchema = z.object({
  searchId: z.string().min(1),
  agentAddress: z.string().min(1),
  position: z.number().int().nonnegative().optional(),
  source: z.string().optional()
});

const createAgentSchema = z.object({
  prompt: z.string().min(4),
  createdBy: z.string().min(2).default("anonymous-builder"),
  price: z.number().int().positive().optional()
});

const runBuilderSchema = z.object({
  input: z.string().min(2)
});

const autoRunSchema = z.object({
  prompt: z.string().min(2),
  buyerId: z.string().min(2).default("auto-user"),
  checkoutId: z.string().optional(),
  preimage: z.string().optional(),
  agentId: z.string().optional()
});

const directChatSchema = z.object({
  agentAddress: z.string().min(2),
  message: z.string().min(1),
  userSeed: z.string().optional(),
  agentverseToken: z.string().optional()
});
const llmSearchSchema = z.object({
  query: z.string().min(1)
});

const submitRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  raterId: z.string().min(2).default("anonymous-rater"),
  comment: z.string().max(500).optional(),
  checkoutId: z.string().optional()
});

const directChatInternalOk = (req: Request): boolean => {
  const configured = process.env.SHOTENX_DIRECT_CHAT_INTERNAL_SECRET?.trim();
  if (!configured) return true;
  const raw = req.headers["x-shotenx-direct-chat-internal"];
  const provided = (Array.isArray(raw) ? raw[0] : raw) as string | undefined;
  const a = Buffer.from(String(provided ?? "").trim(), "utf8");
  const b = Buffer.from(configured, "utf8");
  if (a.length === 0 || a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
};

agentRoutes.post("/direct-chat", async (req, res) => {
  const parsed = directChatSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid payload", errors: parsed.error.issues });
  }

  if (!directChatInternalOk(req)) {
    return res.status(401).json({ success: false, error: "direct_chat_unauthorized" });
  }

  try {
    const seed = parsed.data.userSeed || process.env.UAGENT_DEFAULT_SEED || "frontend";
    const token = parsed.data.agentverseToken || process.env.AGENTVERSE_API_KEY || "";
    const result = await queryUAgentDirect({
      agentAddress: parsed.data.agentAddress,
      message: parsed.data.message,
      userSeed: seed,
      agentverseToken: token
    });

    if (result.success) {
      return res.json({
        response: result.response,
        success: true
      });
    }

    return res.status(502).json({
      response: "Agent could not process this request right now.",
      success: false,
      error: result.error ?? "agent_query_failed"
    });
  } catch (error) {
    return res.status(500).json({
      response: "An error occurred while processing your request.",
      error: normalizeAgentError(error, "unknown_error")
    });
  }
});

agentRoutes.post("/llm-search", async (req, res) => {
  const parsed = llmSearchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Query is required.", errors: parsed.error.issues });
  }

  const query = parsed.data.query.trim();
  try {
    const result = await runLlmAgentSearch(query);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "llm_search_failed",
      message: error instanceof Error ? error.message : "unknown_error"
    });
  }
});

agentRoutes.get("/", async (req, res) => {
  const includeBuilder = String(req.query.includeBuilder ?? "1") !== "0";
  const builderAgents = includeBuilder
    ? builderAgentEngine.listAgents().map((agent) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        rating: 5,
        interactions: agent.usageCount,
        usageCount: agent.usageCount,
        earningsSats: agent.earningsSats,
        priceSats: agent.price,
        category: agent.type,
        tags: ["builder", "paid", "lightning", agent.type],
        address: agent.id,
        handle: "builder",
        featured: true,
        owner: agent.createdBy
      }))
    : [];

  try {
    const response = await agentService.list({
      query: String(req.query.q ?? ""),
      sort:
        req.query.sort === "created-at" ||
        req.query.sort === "last-modified" ||
        req.query.sort === "interactions"
          ? req.query.sort
          : "relevancy",
      direction: req.query.direction === "asc" ? "asc" : "desc",
      offset: Number(req.query.offset ?? 0),
      limit: Number(req.query.limit ?? 30),
      searchId: String(req.query.searchId ?? "")
    });

    res.json({
      ...response,
      agents: [...builderAgents, ...response.agents],
      total: response.total + builderAgents.length,
      num_hits: response.num_hits + builderAgents.length
    });
  } catch (error) {
    if (builderAgents.length > 0) {
      return res.json({
        offset: 0,
        limit: builderAgents.length,
        num_hits: builderAgents.length,
        total: builderAgents.length,
        search_id: "builder-only",
        agents: builderAgents
      });
    }
    res.status(502).json({
      message: error instanceof Error ? error.message : "Agentverse search failed"
    });
  }
});

agentRoutes.post("/create-agent", async (req, res) => {
  const parsed = createAgentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  try {
    const agent = await builderAgentEngine.createFromPrompt(
      parsed.data.prompt,
      parsed.data.createdBy,
      parsed.data.price
    );
    return res.status(201).json({ ok: true, agent });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Agent creation failed"
    });
  }
});

agentRoutes.get("/registry/list", (_req, res) => {
  return res.json({
    ok: true,
    agents: builderAgentEngine.listAgents()
  });
});

agentRoutes.get("/leaderboard", (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 10)));
  const sortMode = String(req.query.sort ?? "earnings");
  const baseRanking = builderAgentEngine.getLeaderboard(100);
  const ids = baseRanking.map((agent) => agent.id);
  const reputationMap = reputationService.getSummaries(ids);

  const enriched = baseRanking.map((agent) => {
    const rep = reputationMap[agent.id];
    return {
      ...agent,
      averageStars: rep?.averageStars ?? 0,
      ratingCount: rep?.ratingCount ?? 0,
      reputationScore: rep?.reputationScore ?? 0
    };
  });

  if (sortMode === "reputation") {
    enriched.sort((a, b) => {
      if (b.reputationScore !== a.reputationScore) {
        return b.reputationScore - a.reputationScore;
      }
      return b.earningsSats - a.earningsSats;
    });
  } else if (sortMode === "trust") {
    // Trust = reputation × earnings, so brand-new high-reviewed agents and
    // proven earners both surface, but pure earnings without ratings get
    // penalized.
    enriched.sort((a, b) => {
      const trustA = (a.reputationScore || 0.01) * Math.log10(a.earningsSats + 10);
      const trustB = (b.reputationScore || 0.01) * Math.log10(b.earningsSats + 10);
      return trustB - trustA;
    });
  }

  return res.json({
    ok: true,
    sort: sortMode,
    agents: enriched.slice(0, limit)
  });
});

agentRoutes.post("/:agentId/rate", ratingRateLimit, (req, res) => {
  const agent = builderAgentEngine.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: "agent_not_found" });
  }

  const parsed = submitRatingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_payload",
      message: "Invalid rating payload",
      issues: parsed.error.issues
    });
  }

  try {
    const entry = reputationService.submitRating({
      agentId: agent.id,
      raterId: parsed.data.raterId,
      stars: parsed.data.stars,
      comment: parsed.data.comment,
      checkoutId: parsed.data.checkoutId
    });
    const summary = reputationService.getSummary(agent.id);
    return res.status(201).json({ ok: true, rating: entry, summary });
  } catch (err) {
    return res.status(400).json({
      error: "rating_rejected",
      message: err instanceof Error ? err.message : "rating_rejected"
    });
  }
});

agentRoutes.get("/:agentId/reputation", (req, res) => {
  const agent = builderAgentEngine.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: "agent_not_found" });
  }
  const summary = reputationService.getSummary(agent.id);
  return res.json({ ok: true, summary });
});

agentRoutes.get("/:agentId/ratings", (req, res) => {
  const agent = builderAgentEngine.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: "agent_not_found" });
  }
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 50)));
  return res.json({
    ok: true,
    agentId: agent.id,
    ratings: reputationService.listRatingsForAgent(agent.id, limit)
  });
});

agentRoutes.post("/auto-run", autoRunRateLimit, async (req, res) => {
  const parsed = autoRunSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  const targetAgent = parsed.data.agentId
    ? builderAgentEngine.getAgent(parsed.data.agentId) ?? null
    : builderAgentEngine.pickBestAgentForPrompt(parsed.data.prompt);
  if (!targetAgent) {
    return res.status(404).json({
      error: "No builder agents available. Create an agent first."
    });
  }

  const executeSelectedAgent = async () => {
    const executed = await builderAgentEngine.runAgent(targetAgent.id, parsed.data.prompt);
    if (!executed) {
      return null;
    }
    return executed;
  };

  try {
    if (parsed.data.checkoutId && parsed.data.preimage) {
      const verified = await paymentService.verifyAndSettle({
        checkoutId: parsed.data.checkoutId,
        preimage: parsed.data.preimage,
        requestPath: "/api/agents/auto-run",
        requestMethod: "POST"
      });
      if (!verified.ok) {
        return res.status(402).json({
          error: "payment_verification_failed",
          reason: verified.reason
        });
      }

      paymentService.consumeSession(parsed.data.checkoutId, "/api/agents/auto-run", "POST");
      const executed = await executeSelectedAgent();
      if (!executed) {
        return res.status(404).json({ error: "Selected agent not found at execution time." });
      }

      return res.json({
        ok: true,
        mode: "auto-agent",
        selectedAgent: executed.agent,
        payment: {
          checkoutId: parsed.data.checkoutId,
          amountSats: targetAgent.price,
          status: "consumed"
        },
        result: executed.output
      });
    }

    let successfulCheckout: Awaited<ReturnType<typeof paymentService.createCheckout>> | null = null;
    try {
      const checkout = await paymentService.createCheckout({
        agentId: targetAgent.id,
        buyerId: parsed.data.buyerId,
        amountSats: targetAgent.price,
        requestPath: "/api/agents/auto-run",
        requestMethod: "POST"
      });
      successfulCheckout = checkout;

      const settled = await paymentService.simulateAgentPayment(checkout.id);
      if (!settled.ok) {
        return res.status(402).json({
          error: "payment_required",
          reason: settled.reason,
          selectedAgent: {
            id: targetAgent.id,
            name: targetAgent.name
          },
          l402: {
            checkoutId: checkout.id,
            paymentRequest: checkout.invoice,
            amountSats: checkout.amountSats
          }
        });
      }

      paymentService.consumeSession(checkout.id, "/api/agents/auto-run", "POST");
    } catch (paymentError) {
      const detail = paymentError instanceof Error ? paymentError.message : "";
      const executedWithoutPayment = await executeSelectedAgent();
      if (!executedWithoutPayment) {
        return res.status(404).json({ error: "Selected agent not found at execution time." });
      }
      return res.json({
        ok: true,
        mode: "auto-agent",
        selectedAgent: executedWithoutPayment.agent,
        payment: {
          checkoutId: "",
          amountSats: 0,
          status: "skipped"
        },
        warning: detail
          ? `Payment skipped (${detail.slice(0, 160)}). Agent ran without paywall.`
          : "Payment skipped because backend wallet is unavailable. Agent ran without paywall.",
        result: executedWithoutPayment.output
      });
    }

    const executed = await executeSelectedAgent();
    if (!executed) {
      return res.status(404).json({ error: "Selected agent not found at execution time." });
    }

    return res.json({
      ok: true,
      mode: "auto-agent",
      selectedAgent: executed.agent,
      payment: {
        checkoutId: successfulCheckout?.id ?? "",
        amountSats: successfulCheckout?.amountSats ?? targetAgent.price,
        status: "consumed"
      },
      result: executed.output
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "Auto agent run failed."
    });
  }
});

agentRoutes.post("/:agentId/run", builderRunRateLimit, async (req, res, next) => {
  const agent = builderAgentEngine.getAgent(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ error: "Agent not found" });
  }
  req.body = {
    ...req.body,
    amountSats: agent.price,
    agentId: agent.id,
    buyerId: req.body?.buyerId ?? "anonymous-user"
  };
  return l402Paywall(req, res, next);
}, async (req, res) => {
  const parsed = runBuilderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  try {
    const executed = await builderAgentEngine.runAgent(req.params.agentId, parsed.data.input);
    if (!executed) {
      return res.status(404).json({ error: "Agent not found" });
    }

    return res.json({
      ok: true,
      agent: executed.agent,
      result: executed.output
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "builder_run_failed"
    });
  }
});

agentRoutes.post("/feedback/click", async (req, res) => {
  const parsed = clickSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  searchAnalyticsService.recordClick(
    parsed.data.searchId,
    parsed.data.agentAddress
  );

  try {
    await agentverseService.sendClickFeedback({
      searchId: parsed.data.searchId,
      agentAddress: parsed.data.agentAddress,
      source: parsed.data.source,
      position: parsed.data.position
    });

    return res.json({
      ok: true,
      sentToAgentverse: true,
      analytics: searchAnalyticsService.getSnapshot(parsed.data.searchId)
    });
  } catch (error) {
    return res.status(202).json({
      ok: true,
      sentToAgentverse: false,
      warning: error instanceof Error ? error.message : "Feedback delivery failed",
      analytics: searchAnalyticsService.getSnapshot(parsed.data.searchId)
    });
  }
});

agentRoutes.get("/analytics/:searchId", (req, res) => {
  const snapshot = searchAnalyticsService.getSnapshot(req.params.searchId);
  res.json(snapshot);
});

agentRoutes.get("/:agentId", (req, res) => {
  const builderAgent = builderAgentEngine.getAgent(req.params.agentId);
  if (builderAgent) {
    const reputation = reputationService.getSummary(builderAgent.id);
    return res.json({
      id: builderAgent.id,
      name: builderAgent.name,
      description: builderAgent.description,
      rating: reputation.averageStars > 0 ? reputation.averageStars : 5,
      interactions: builderAgent.usageCount,
      usageCount: builderAgent.usageCount,
      earningsSats: builderAgent.earningsSats,
      priceSats: builderAgent.price,
      category: builderAgent.type,
      tags: ["builder", "paid", builderAgent.type],
      address: builderAgent.id,
      featured: true,
      reputation
    });
  }

  const agent = agentService.byId(req.params.agentId);
  if (!agent) {
    return res.status(404).json({ message: "Agent not found" });
  }
  return res.json(agent);
});
