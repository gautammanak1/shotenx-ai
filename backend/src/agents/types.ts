export type BuilderAgentType = "content" | "image" | "code";

/** Optional routing for specialized prompts (see engine + templates). */
export type BuilderAgentPreset = "tech-daily" | "asi1-image";

export interface BuilderAgent {
  id: string;
  name: string;
  description: string;
  type: BuilderAgentType;
  /** When set, runAgent uses a dedicated template instead of generic content/image. */
  preset?: BuilderAgentPreset;
  price: number;
  endpoint: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
  earningsSats: number;
}

