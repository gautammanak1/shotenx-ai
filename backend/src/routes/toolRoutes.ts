import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { l402PaywallFor } from "../middleware/l402Paywall";

const requestSchema = z.object({
  prompt: z.string().min(4),
  agentId: z.string().optional(),
  buyerId: z.string().optional(),
  amountSats: z.number().int().positive().optional()
});

export const toolRoutes = Router();
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

toolRoutes.post("/summarize", l402PaywallFor(10), (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  const raw = parsed.data.prompt.trim();
  const words = raw.split(/\s+/);
  const preview = words.slice(0, 20).join(" ");

  return res.json({
    ok: true,
    result: {
      summary:
        words.length <= 20
          ? raw
          : `${preview}...`,
      words: words.length,
      note: "Paid execution complete."
    }
  });
});

toolRoutes.post("/code-review", l402PaywallFor(50), (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }
  const raw = parsed.data.prompt.trim();
  const lines = raw.split("\n").length;
  return res.json({
    ok: true,
    result: {
      review: `Paid code review (${lines} lines of input). Focus: structure, edge cases, and test gaps. Next step: add unit tests for critical paths.`,
      lines,
      note: "Paid execution complete (50 sats)."
    }
  });
});

toolRoutes.post("/image-caption", l402PaywallFor(20), (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }
  const raw = parsed.data.prompt.trim();
  return res.json({
    ok: true,
    result: {
      caption: `Scene / subject summary: ${raw.slice(0, 400)}${raw.length > 400 ? "…" : ""}`,
      note: "Paid execution complete (20 sats)."
    }
  });
});

toolRoutes.post("/generate-image", l402PaywallFor(20), async (req, res) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid payload", errors: parsed.error.issues });
  }

  if (!openai) {
    return res.status(200).json({
      ok: true,
      result: {
        imageUrl: "https://picsum.photos/seed/shotenx-paid/1024/1024",
        note: "OPENAI_API_KEY is not configured; returned placeholder image for demo flow."
      }
    });
  }

  try {
    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: parsed.data.prompt,
      size: "1024x1024"
    });

    const imageBase64 = response.data?.[0]?.b64_json;
    if (!imageBase64) {
      return res.status(502).json({ error: "Image generation returned empty payload." });
    }

    return res.json({
      ok: true,
      result: {
        imageDataUrl: `data:image/png;base64,${imageBase64}`,
        note: "Paid execution complete."
      }
    });
  } catch (error) {
    return res.status(502).json({
      error: error instanceof Error ? error.message : "image_generation_failed"
    });
  }
});
