import express, { Request, Response, NextFunction } from "express";
import path from "node:path";
import optimizeRouter from "./api/optimize";
import extractTextRouter from "./api/extractText";
import movieRouter from "./api/movie";
import { getRecentActivity, onActivity, offActivity } from "./activityStream";

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.static(path.resolve(process.cwd(), "public")));

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public", "agents.html"));
});

app.get("/dashboard", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public", "agents.html"));
});

app.get("/agents", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public", "agents.html"));
});

app.get("/resume-agent", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
});

app.get("/movie-agent", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public", "movie-agent.html"));
});

app.get("/a2a-ui", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public", "a2a.html"));
});

app.get("/ap2", (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), "public", "a2a.html"));
});

app.get("/a2a/jsonrpc", (_req: Request, res: Response) => {
  res.status(200).json({
    message:
      "This endpoint expects POST JSON-RPC. You can use /a2a-ui or /dashboard for the browser UI."
  });
});

app.get("/a2a/rest", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "A2A REST base route is available on the A2A server.",
    a2a_server: process.env.A2A_PUBLIC_BASE_URL || "http://localhost:41242"
  });
});

app.post("/a2a/jsonrpc", async (req: Request, res: Response) => {
  const a2aBase = (process.env.A2A_PUBLIC_BASE_URL || "http://localhost:41242").replace(
    /\/+$/,
    ""
  );
  try {
    const upstream = await fetch(`${a2aBase}/a2a/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body)
    });
    const text = await upstream.text();
    res.status(upstream.status).type("application/json").send(text);
  } catch (error) {
    res.status(502).json({
      error: "A2A server is not reachable.",
      details: (error as Error).message
    });
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/activity", (_req: Request, res: Response) => {
  res.status(200).json({ events: getRecentActivity() });
});

app.get("/api/activity/stream", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const listener = (event: unknown): void => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  onActivity(listener);

  _req.on("close", () => {
    offActivity(listener);
    res.end();
  });
});

app.use("/api/extract-text", extractTextRouter);
app.use("/api/optimize", optimizeRouter);
app.use("/api/movie", movieRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found." });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[API] Unhandled error:", err.message);
  res.status(500).json({ error: "Unhandled server error." });
});

export default app;
