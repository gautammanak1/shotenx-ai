import type OpenAI from "openai";
import { builderChatModel } from "../llmClient";

export async function runCodeTemplate(
  input: string,
  name: string,
  client: OpenAI | null
): Promise<Record<string, unknown>> {
  const snippet = input.trim();
  if (!snippet) {
    return {
      mode: "code",
      summary: `Agent "${name}" received an empty code request.`,
      suggestions: ["Paste the code or error output you want reviewed."],
      snippet: "",
    };
  }

  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: builderChatModel(),
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: [
              `You are "${name}", a senior engineer.`,
              "Review or implement as requested. Prefer fenced code blocks for new code.",
              "Call out security, edge cases, and tests briefly.",
            ].join(" "),
          },
          { role: "user", content: snippet },
        ],
      });
      const review = completion.choices[0]?.message?.content?.trim();
      if (review) {
        return {
          mode: "code",
          summary: `Agent "${name}" — LLM review`,
          review,
          snippet: snippet.length > 2000 ? `${snippet.slice(0, 2000)}…` : snippet,
          meta: { provider: "llm", model: builderChatModel() },
        };
      }
    } catch {
      /* fall through */
    }
  }

  return {
    mode: "code",
    summary: `Agent "${name}" — offline checklist (set ASI_ONE_API_KEY or OPENAI_API_KEY for full review).`,
    suggestions: [
      "Validate inputs and fail closed on bad state.",
      "Keep payment / auth paths auditable (structured logs, no secrets in logs).",
      "Add regression tests around money movement and L402 verification.",
    ],
    snippet: snippet.length > 1200 ? `${snippet.slice(0, 1200)}…` : snippet,
  };
}
