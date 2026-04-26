import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { logActivity } from "../activityStream";

const movieRouter = Router();

movieRouter.post("/", async (req: Request, res: Response) => {
  try {
    const query = String(req.body?.query || "").trim();
    if (!query) {
      return res.status(400).json({ error: "Missing query. Expected { query: string }." });
    }

    const apiKey = process.env.ASI_ONE_API_KEY?.trim();
    const baseURL = (process.env.ASI_ONE_BASE_URL || "https://api.asi1.ai/v1")
      .trim()
      .replace(/\/chat\/completions$/i, "")
      .replace(/\/+$/, "");
    const model = (process.env.ASI_ONE_MODEL || "asi1-mini").trim();

    if (!apiKey) {
      return res.status(500).json({ error: "ASI_ONE_API_KEY is not set." });
    }

    const client = new OpenAI({ apiKey, baseURL });
    logActivity("MovieAgent", `Received movie query: ${query.slice(0, 80)}`);

    const response = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "You are a movie expert. Return only JSON with keys: answer, recommendations (array of {title, year, reason}), follow_up_questions (string[])."
        },
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) {
      return res.status(502).json({ error: "Movie agent returned empty response." });
    }

    const parsed = JSON.parse(text);
    logActivity("MovieAgent", "Movie response generated.");
    return res.status(200).json(parsed);
  } catch (error) {
    const message = (error as Error).message;
    logActivity("MovieAgent", `Movie agent failed: ${message}`, "error");
    return res.status(500).json({ error: "Movie agent failed.", details: message });
  }
});

export default movieRouter;
