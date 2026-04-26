import OpenAI from "openai";

/** ASI1-compatible chat (OpenAI SDK + custom base URL). */
export function getBuilderChatClient(): OpenAI | null {
  const asiKey = process.env.ASI_ONE_API_KEY?.trim();
  if (asiKey) {
    return new OpenAI({
      apiKey: asiKey,
      baseURL: process.env.ASI_ONE_BASE_URL?.trim() || "https://api.asi1.ai/v1",
    });
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return new OpenAI({ apiKey: openaiKey });
  }
  return null;
}

/** Native OpenAI only (image generation API). */
export function getOpenAiImageClient(): OpenAI | null {
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  return openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
}

export function builderChatModel(): string {
  const explicit = process.env.BUILDER_LLM_MODEL?.trim();
  if (explicit) return explicit;
  if (process.env.ASI_ONE_API_KEY?.trim()) return process.env.ASI_ONE_MODEL?.trim() || "asi1";
  return "gpt-4o-mini";
}
