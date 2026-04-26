import { Router } from "express";
import { z } from "zod";
import { runLlmAgentSearch } from "../services/llmAgentSearchService";

/** Mirrors Next.js `POST /api/market/llm-agent-search` → same logic as `POST /api/agents/llm-search`. */
export const marketLlmAliasRoutes = Router();

const querySchema = z.object({
  query: z.string().min(1)
});

marketLlmAliasRoutes.post("/llm-agent-search", async (req, res) => {
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Query is required.", errors: parsed.error.issues });
  }

  try {
    const result = await runLlmAgentSearch(parsed.data.query.trim());
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      error: "llm_search_failed",
      message: error instanceof Error ? error.message : "unknown_error"
    });
  }
});
