import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

type SourceType = "fetch" | "openai" | "a2a";

type AgentSuggestion = {
  id: string;
  name: string;
  address: string;
  source: SourceType;
  reason: string;
};

const BACKEND_BASE = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

function scoreByWords(query: string, text: string): number {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (words.length === 0) return 0;
  const haystack = text.toLowerCase();
  return words.reduce((acc, word) => (haystack.includes(word) ? acc + 1 : acc), 0);
}

function fallbackSuggest(query: string, fetchAgents: AgentSuggestion[]): AgentSuggestion[] {
  return fetchAgents
    .map((candidate) => ({
      candidate,
      score: scoreByWords(query, `${candidate.name} ${candidate.reason} ${candidate.address}`)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((item) => item.candidate);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: string };
    const query = body.query?.trim() ?? "";
    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    const backendUrl = new URL(`${BACKEND_BASE}/api/agents`);
    backendUrl.searchParams.set("q", query);
    backendUrl.searchParams.set("limit", "20");

    const backendResponse = await fetch(backendUrl.toString(), { cache: "no-store" });
    const backendPayload = backendResponse.ok
      ? ((await backendResponse.json()) as { agents?: Array<{ id: string; name: string; address?: string; description?: string }> })
      : { agents: [] };

    const fetchSuggestions: AgentSuggestion[] = (backendPayload.agents ?? []).slice(0, 20).map((agent) => ({
      id: agent.id,
      name: agent.name,
      address: agent.address ?? agent.id,
      source: "fetch",
      reason: agent.description || "Live Fetch.ai marketplace agent"
    }));

    const apiKey = process.env.ASI_ONE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ suggestions: fallbackSuggest(query, fetchSuggestions), mode: "fallback-no-key" });
    }

    const client = new OpenAI({
      apiKey,
      baseURL: process.env.ASI_ONE_BASE_URL ?? "https://api.asi1.ai/v1"
    });

    const shortlist = fetchSuggestions.slice(0, 30);
    const prompt = [
      "You are ranking and enriching marketplace agents for a user query.",
      "You may include source types: fetch, openai, a2a.",
      "Prefer real fetch agents when relevant; only add other source types if they clearly fit query intent.",
      "Return strictly valid JSON in this exact shape:",
      "{\"suggestions\":[{\"id\":\"...\",\"name\":\"...\",\"address\":\"...\",\"source\":\"fetch|openai|a2a\",\"reason\":\"...\"}]}",
      `User query: ${query}`,
      `Candidates: ${JSON.stringify(shortlist)}`
    ].join("\n");

    const completion = await client.chat.completions.create({
      model: process.env.ASI_ONE_MODEL ?? "asi1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content ?? "";
    let parsed: { suggestions?: AgentSuggestion[] } | null = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }

    const suggestions = (parsed?.suggestions ?? fallbackSuggest(query, fetchSuggestions))
      .filter((item) => item?.id && item?.name && item?.address && item?.source && item?.reason)
      .slice(0, 6);

    return NextResponse.json({ suggestions, mode: "asi1" });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error in LLM agent search"
      },
      { status: 500 }
    );
  }
}
