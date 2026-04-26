import type OpenAI from "openai";
import { builderChatModel } from "../llmClient";

/** Company-name → plain-text “AI tech daily” style briefing (no markdown). */
export async function runTechDailyTemplate(
  input: string,
  agentName: string,
  client: OpenAI | null
): Promise<Record<string, unknown>> {
  const company = input.trim() || "Example Corp";
  if (!client) {
    return {
      mode: "content",
      text: [
        `AI / tech daily (offline — set ASI_ONE_API_KEY or OPENAI_API_KEY):`,
        ``,
        `Company: ${company}`,
        `Draft a short briefing with sections OVERVIEW, RECENT MOVES, AI ANGLE, RISKS — plain text only.`,
      ].join("\n"),
      meta: { fallback: true },
    };
  }

  try {
    const completion = await client.chat.completions.create({
      model: builderChatModel(),
      temperature: 0.35,
      max_tokens: 1400,
      messages: [
        {
          role: "system",
          content: [
            `You are "${agentName}", modeled after an “AI tech daily” briefing agent.`,
            "The user message is ONLY a company name, product name, or very short phrase identifying one company.",
            "Write a concise briefing: OVERVIEW, RECENT MOVES, AI ANGLE, WATCHLIST (optional).",
            "Use PLAIN TEXT only: no markdown, no # headings, no **bold**, no bullet markdown. You may use short ALL CAPS section titles on their own line, then a blank line, then paragraphs.",
            "Be factual and neutral; if you lack real-time data, say so briefly and give typical patterns for that sector.",
            "Do not add hashtags or social handles.",
          ].join(" "),
        },
        { role: "user", content: company },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim();
    if (text) {
      return { mode: "content", text, meta: { provider: "llm", preset: "tech-daily", model: builderChatModel() } };
    }
  } catch {
    /* fall through */
  }

  return {
    mode: "content",
    text: `Could not generate briefing for "${company}". Try again or check API keys.`,
    meta: { error: true },
  };
}
