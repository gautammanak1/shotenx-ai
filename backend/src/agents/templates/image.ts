import type OpenAI from "openai";
import type { BuilderAgent } from "../types";
import { builderChatModel } from "../llmClient";

export async function runImageTemplate(
  input: string,
  agent: BuilderAgent,
  imageClient: OpenAI | null,
  chatClient: OpenAI | null
): Promise<Record<string, unknown>> {
  const name = agent.name;
  const prompt = input.trim() || "abstract monochrome product hero";

  if (imageClient) {
    try {
      const response = await imageClient.images.generate({
        model: process.env.BUILDER_IMAGE_MODEL?.trim() || "gpt-image-1",
        prompt: `${name}: ${prompt}`.slice(0, 3200),
        size: "1024x1024",
      });
      const imageBase64 = response.data?.[0]?.b64_json;
      if (imageBase64) {
        const imageDataUrl = `data:image/png;base64,${imageBase64}`;
        return {
          mode: "image",
          prompt,
          imageUrl: imageDataUrl,
          imageDataUrl,
          note: "Generated via OpenAI Images API.",
        };
      }
    } catch {
      /* fall through */
    }
  }

  if (chatClient) {
    try {
      const completion = await chatClient.chat.completions.create({
        model: builderChatModel(),
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content:
              "You help when image APIs are unavailable. Output 3–5 short lines (plain text, no markdown): subject, composition, lighting, palette, style. No hashtags.",
          },
          { role: "user", content: `Image brief for "${name}": ${prompt}` },
        ],
      });
      const plan = completion.choices[0]?.message?.content?.trim() ?? "";
      return {
        mode: "image",
        prompt,
        imageUrl: `https://picsum.photos/seed/${encodeURIComponent(name + prompt.slice(0, 40))}/1024/1024`,
        creativePlan: plan,
        note: "Placeholder image (picsum). Set OPENAI_API_KEY for gpt-image-1 generation, or refine brief from creativePlan.",
      };
    } catch {
      /* fall through */
    }
  }

  return {
    mode: "image",
    prompt,
    imageUrl: `https://picsum.photos/seed/${encodeURIComponent(name + prompt.slice(0, 40))}/1024/1024`,
    note: "Placeholder image. Configure OPENAI_API_KEY for real generation, or ASI_ONE_API_KEY for a text plan only.",
  };
}
