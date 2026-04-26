import type OpenAI from "openai";
import { builderChatModel } from "../llmClient";

export async function runContentTemplate(
  input: string,
  name: string,
  client: OpenAI | null
): Promise<Record<string, unknown>> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { mode: "content", text: "", meta: { empty: true } };
  }

  if (client) {
    try {
      const completion = await client.chat.completions.create({
        model: builderChatModel(),
        temperature: 0.35,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content: [
              `You are "${name}", a paid professional writer.`,
              "Follow the user's instructions exactly.",
              "Output in PLAIN TEXT only: no markdown (no # headings, no **bold**, no ``` fences, no bullet markdown). Use simple paragraphs and line breaks.",
              "Do not add hashtags, social handles, or marketing fluff unless the user explicitly asked for social posts.",
              "Do not prepend phrases like 'As an AI' or 'Here is'.",
              "Output only the deliverable the user asked for.",
            ].join(" "),
          },
          { role: "user", content: trimmed },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (text) {
        return { mode: "content", text, meta: { provider: "llm", model: builderChatModel() } };
      }
    } catch {
      /* fall through */
    }
  }

  return {
    mode: "content",
    text: [`Draft (no LLM key configured — set ASI_ONE_API_KEY or OPENAI_API_KEY for full generation):`, ``, trimmed].join(
      "\n"
    ),
    meta: { length: trimmed.length, fallback: true },
  };
}
