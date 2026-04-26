import * as fs from "node:fs";
import * as path from "node:path";
import { v4 as uuid } from "uuid";
import OpenAI from "openai";
import { BuilderAgent, BuilderAgentType } from "./types";
import { runContentTemplate } from "./templates/content";
import { runImageTemplate } from "./templates/image";
import { runCodeTemplate } from "./templates/code";
import { runTechDailyTemplate } from "./templates/techDaily";
import { runAsi1ImageTemplate } from "./templates/asiImage";
import { getBuilderChatClient, getOpenAiImageClient } from "./llmClient";

const registryPath = path.resolve(process.cwd(), "src", "agents", "registry.json");
const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const ensureRegistry = () => {
  const dir = path.dirname(registryPath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(registryPath)) {
    fs.writeFileSync(registryPath, JSON.stringify([], null, 2), "utf8");
  }
};

const readRegistry = (): BuilderAgent[] => {
  ensureRegistry();
  const raw = fs.readFileSync(registryPath, "utf8").trim();
  if (!raw) return [];
  try {
    return JSON.parse(raw) as BuilderAgent[];
  } catch {
    return [];
  }
};

const writeRegistry = (agents: BuilderAgent[]) => {
  ensureRegistry();
  fs.writeFileSync(registryPath, JSON.stringify(agents, null, 2), "utf8");
};

export const inferType = (prompt: string): BuilderAgentType => {
  const lower = prompt.toLowerCase();

  const imageHints =
    /\b(image|photo|picture|thumbnail|banner|logo|icon|svg|diagram|illustration|dall-?e|midjourney|stable\s*diffusion|flux|render|mockup|cover\s*art|album\s*art|meme)\b/;
  const codeHints =
    /\b(code|debug|refactor|stack\s*trace|typescript|javascript|python|golang|rust|java|sql|regex|unit\s*test|jest|pytest|api|bug|compile|error\s*ts|github|pull\s*request|review\s*my)\b/;

  if (imageHints.test(lower)) return "image";
  if (codeHints.test(lower)) return "code";

  if (
    lower.includes("image") ||
    lower.includes("photo") ||
    lower.includes("picture") ||
    lower.includes("design") ||
    lower.includes("thumbnail") ||
    lower.includes("logo") ||
    lower.includes("diagram")
  ) {
    return "image";
  }
  if (
    lower.includes("code") ||
    lower.includes("debug") ||
    lower.includes("bug") ||
    lower.includes("refactor") ||
    lower.includes("typescript") ||
    lower.includes("python") ||
    lower.includes("function")
  ) {
    return "code";
  }
  return "content";
};

const defaultPrice = (type: BuilderAgentType) => {
  if (type === "image") return 20;
  if (type === "code") return 15;
  return 10;
};

const createName = (prompt: string, type: BuilderAgentType) => {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return type === "content" ? "Content Agent" : type === "image" ? "Image Agent" : "Code Agent";
  }
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}...` : cleaned;
};

const scoreAgentForPrompt = (agent: BuilderAgent, prompt: string) => {
  const queryWords = prompt
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const haystack = `${agent.name} ${agent.description} ${agent.type}`.toLowerCase();
  const textScore = queryWords.reduce((score, word) => (haystack.includes(word) ? score + 2 : score), 0);
  const qualityScore = Math.min(10, agent.usageCount) + Math.min(20, agent.earningsSats / 10);
  return textScore + qualityScore;
};

export const builderAgentEngine = {
  listAgents() {
    return readRegistry().sort((a, b) => {
      if (b.earningsSats !== a.earningsSats) return b.earningsSats - a.earningsSats;
      return b.usageCount - a.usageCount;
    });
  },

  getAgent(id: string) {
    return readRegistry().find((agent) => agent.id === id);
  },

  getLeaderboard(limit = 10) {
    return this.listAgents().slice(0, Math.max(1, limit));
  },

  async createFromPrompt(prompt: string, createdBy: string, priceOverride?: number) {
    let type = inferType(prompt);
    let generatedName = createName(prompt, type);
    let generatedDescription = prompt.trim() || `Custom ${type} agent`;

    if (openaiClient) {
      try {
        const completion = await openaiClient.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You generate concise marketplace agent configs. Return valid JSON with keys: name, description, type(content|image|code), price.",
            },
            {
              role: "user",
              content: `Prompt: ${prompt}`,
            },
          ],
        });
        const raw = completion.choices[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(raw) as {
          name?: string;
          description?: string;
          type?: BuilderAgentType;
          price?: number;
        };
        if (parsed.type === "content" || parsed.type === "image" || parsed.type === "code") {
          type = parsed.type;
        }
        if (parsed.name?.trim()) {
          generatedName = parsed.name.trim().slice(0, 64);
        }
        if (parsed.description?.trim()) {
          generatedDescription = parsed.description.trim();
        }
        if (typeof parsed.price === "number" && parsed.price > 0 && !priceOverride) {
          priceOverride = Math.floor(parsed.price);
        }
      } catch {
        // Fallback to deterministic local inference.
      }
    }

    const id = `agent_${uuid()}`;
    const price =
      Number.isFinite(priceOverride) && Number(priceOverride) > 0
        ? Math.floor(Number(priceOverride))
        : defaultPrice(type);

    const agent: BuilderAgent = {
      id,
      name: generatedName,
      description: generatedDescription,
      type,
      price,
      endpoint: `/api/agents/${id}/run`,
      createdBy,
      createdAt: new Date().toISOString(),
      usageCount: 0,
      earningsSats: 0,
    };

    const all = readRegistry();
    all.push(agent);
    writeRegistry(all);
    return agent;
  },

  async runAgent(id: string, input: string) {
    const all = readRegistry();
    const index = all.findIndex((agent) => agent.id === id);
    if (index < 0) return null;

    const agent = all[index];
    const chatClient = getBuilderChatClient();
    const imageClient = getOpenAiImageClient();

    let output: Record<string, unknown>;
    if (agent.preset === "tech-daily") {
      output = await runTechDailyTemplate(input, agent.name, chatClient);
    } else if (agent.preset === "asi1-image") {
      output = await runAsi1ImageTemplate(input, agent.name);
    } else if (agent.type === "image") {
      output = await runImageTemplate(input, agent, imageClient, chatClient);
    } else if (agent.type === "code") {
      output = await runCodeTemplate(input, agent.name, chatClient);
    } else {
      output = await runContentTemplate(input, agent.name, chatClient);
    }

    const updated: BuilderAgent = {
      ...agent,
      usageCount: agent.usageCount + 1,
      earningsSats: agent.earningsSats + agent.price,
    };
    all[index] = updated;
    writeRegistry(all);

    return {
      agent: updated,
      output,
    };
  },

  /** Prefer agents whose type matches inferred task (image/code/content), then word + quality score. */
  pickBestAgentForPrompt(prompt: string) {
    const inferred = inferType(prompt);
    const all = this.listAgents();
    if (all.length === 0) return null;

    const typed = all.filter((a) => a.type === inferred);
    const pool = typed.length > 0 ? typed : all;

    const scored = pool.map((agent) => ({
      agent,
      score: scoreAgentForPrompt(agent, prompt),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.agent ?? null;
  },
};
