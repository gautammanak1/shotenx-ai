import OpenAI from "openai";
import { agentService } from "./agentService";
import { builderAgentEngine } from "../agents/engine";

type SourceType = "fetch" | "openai" | "a2a";

export type AgentSuggestion = {
  id: string;
  name: string;
  address: string;
  source: SourceType;
  reason: string;
};

const scoreByWords = (query: string, text: string): number => {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  if (words.length === 0) return 0;
  const haystack = text.toLowerCase();
  return words.reduce((acc, word) => (haystack.includes(word) ? acc + 1 : acc), 0);
};

const fallbackSuggest = (query: string, fetchAgents: AgentSuggestion[]) =>
  fetchAgents
    .map((candidate) => ({
      candidate,
      score: scoreByWords(query, `${candidate.name} ${candidate.reason} ${candidate.address}`)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.candidate);

const builderAgentToSuggestion = (agent: {
  id: string;
  name: string;
  description: string;
}): AgentSuggestion => {
  const blob = `${agent.name} ${agent.description}`.toLowerCase();
  let source: SourceType = "fetch";
  if (blob.includes("a2a") || agent.id.toLowerCase().includes("a2a")) {
    source = "a2a";
  } else if (
    blob.includes("openai") ||
    blob.includes("asi1") ||
    blob.includes("asi-1")
  ) {
    source = "openai";
  }
  return {
    id: agent.id,
    name: agent.name,
    address: agent.id,
    source,
    reason: agent.description || "ShotenX builder agent (L402 per run)"
  };
};

const extractJsonObject = (text: string) => {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
};

export async function runLlmAgentSearch(query: string): Promise<{
  suggestions: AgentSuggestion[];
  mode: string;
  warning?: string;
}> {
  const trimmed = query.trim();
  const builderSuggestions = builderAgentEngine.listAgents().map(builderAgentToSuggestion);

  let fetchSuggestions: AgentSuggestion[];
  try {
    const fetched = await agentService.list({
      query: trimmed,
      sort: "relevancy",
      direction: "desc",
      offset: 0,
      limit: 20,
      searchId: ""
    });

    const agentverseSuggestions: AgentSuggestion[] = (fetched.agents ?? []).slice(0, 20).map((agent) => ({
      id: agent.id,
      name: agent.name,
      address: agent.address ?? agent.id,
      source: "fetch" as const,
      reason: agent.description || "Live Fetch.ai marketplace agent"
    }));
    fetchSuggestions = [...builderSuggestions, ...agentverseSuggestions];
  } catch {
    return {
      suggestions: fallbackSuggest(trimmed, builderSuggestions).slice(0, 6),
      mode: "degraded",
      warning: "agentverse_list_failed"
    };
  }

  const apiKey = process.env.ASI_ONE_API_KEY;
  if (!apiKey) {
    return {
      suggestions: fallbackSuggest(trimmed, fetchSuggestions),
      mode: "fallback-no-key"
    };
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.ASI_ONE_BASE_URL ?? "https://api.asi1.ai/v1"
  });
  const shortlist = fetchSuggestions.slice(0, 40);
  const prompt = [
    "You are ranking and enriching marketplace agents for a user query.",
    "You may include source types: fetch, openai, a2a.",
    "Prefer real fetch agents when relevant; only add other source types if they clearly fit query intent.",
    "Return strictly valid JSON in this exact shape:",
    "{\"suggestions\":[{\"id\":\"...\",\"name\":\"...\",\"address\":\"...\",\"source\":\"fetch|openai|a2a\",\"reason\":\"...\"}]}",
    `User query: ${trimmed}`,
    `Candidates: ${JSON.stringify(shortlist)}`
  ].join("\n");

  try {
    const completion = await client.chat.completions.create({
      model: process.env.ASI_ONE_MODEL ?? "asi1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content ?? "";
    let parsedContent: { suggestions?: AgentSuggestion[] } | null = null;
    try {
      parsedContent = JSON.parse(extractJsonObject(content)) as { suggestions?: AgentSuggestion[] };
    } catch {
      parsedContent = null;
    }

    const suggestions = (parsedContent?.suggestions ?? fallbackSuggest(trimmed, fetchSuggestions))
      .filter((item) => item?.id && item?.name && item?.address && item?.source && item?.reason)
      .slice(0, 6);

    return { suggestions, mode: "asi1" };
  } catch (error) {
    const degradedBuilders = builderAgentEngine.listAgents().map(builderAgentToSuggestion);
    return {
      suggestions: fallbackSuggest(trimmed, degradedBuilders).slice(0, 6),
      mode: "degraded",
      warning: error instanceof Error ? error.message : "llm_search_failed"
    };
  }
}
