import OpenAI from "openai";
import { JobOptimizerInput, JobOptimizerOutput } from "../types";
import { buildJobOptimizerPrompt } from "../utils/promptBuilder";
import { logActivity } from "../activityStream";

/**
 * ASI One is OpenAI-compatible for **chat completions** only.
 * baseURL must be the API root, e.g. `https://api.asi1.ai/v1` — not `.../chat/completions`.
 */
function normalizeAsiOneBaseUrl(raw: string): string {
  let base = raw.trim().replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(base)) {
    base = base.replace(/\/chat\/completions$/i, "");
  }
  return base.replace(/\/+$/, "");
}

function safeJsonParse(raw: string): JobOptimizerOutput {
  try {
    return JSON.parse(raw) as JobOptimizerOutput;
  } catch (error) {
    logActivity("Agent", "Failed to parse model response as JSON.", "error");
    throw new Error(
      `Failed to parse model response as JSON: ${(error as Error).message}`
    );
  }
}

export async function jobApplicationOptimizer(
  input: JobOptimizerInput
): Promise<JobOptimizerOutput> {
  const asiOneApiKey = process.env.ASI_ONE_API_KEY?.trim();
  const asiOneBaseUrlRaw = process.env.ASI_ONE_BASE_URL?.trim();
  const asiOneBaseUrl = asiOneBaseUrlRaw ? normalizeAsiOneBaseUrl(asiOneBaseUrlRaw) : "";
  const asiOneModel = process.env.ASI_ONE_MODEL || "asi1-mini";

  if (!asiOneApiKey) {
    throw new Error("ASI_ONE_API_KEY is not set.");
  }

  if (!asiOneBaseUrl) {
    throw new Error("ASI_ONE_BASE_URL is not set.");
  }

  if (asiOneBaseUrlRaw && /\/chat\/completions\b/i.test(asiOneBaseUrlRaw)) {
    logActivity(
      "Agent",
      `ASI_ONE_BASE_URL pointed at /chat/completions; using API root ${asiOneBaseUrl} for the OpenAI client (per ASI One docs).`
    );
  }

  const llmClient = new OpenAI({
    apiKey: asiOneApiKey,
    baseURL: asiOneBaseUrl
  });

  const prompt = buildJobOptimizerPrompt(input);

  console.info("[JobApplicationOptimizerAgent] Sending request to ASI One model");
  logActivity("Agent", "Built prompt and sending request to ASI One model.");

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You respond with a single JSON object only. No markdown, no code fences, no explanation outside JSON."
    },
    { role: "user", content: prompt }
  ];

  let response: OpenAI.Chat.Completions.ChatCompletion;

  try {
    response = await llmClient.chat.completions.create({
      model: asiOneModel,
      temperature: 0.2,
      max_tokens: 4096,
      messages,
      response_format: { type: "json_object" }
    });
  } catch (error) {
    if (error instanceof OpenAI.BadRequestError) {
      logActivity(
        "Agent",
        "Chat completion with response_format failed; retrying without response_format (provider may not support it)."
      );
      response = await llmClient.chat.completions.create({
        model: asiOneModel,
        temperature: 0.2,
        max_tokens: 4096,
        messages
      });
    } else if (error instanceof OpenAI.APIError && error.status === 401) {
      throw new Error(
        "ASI One returned 401 (unauthorized). Verify ASI_ONE_API_KEY is valid, and set ASI_ONE_BASE_URL to https://api.asi1.ai/v1 (not the full /chat/completions URL)."
      );
    } else {
      throw error;
    }
  }

  const rawOutput = response.choices[0]?.message?.content?.trim();

  if (!rawOutput) {
    logActivity("Agent", "ASI One returned empty output.", "error");
    throw new Error("ASI One returned an empty response.");
  }

  const parsed = safeJsonParse(rawOutput);

  console.info("[JobApplicationOptimizerAgent] Successfully parsed JSON response");
  logActivity("Agent", "Successfully parsed model JSON response.");

  return parsed;
}
