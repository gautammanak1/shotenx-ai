import "./loadEnv";
import express from "express";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { AGENT_CARD_PATH } from "@a2a-js/sdk";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import { agentCardHandler, jsonRpcHandler, restHandler, UserBuilder } from "@a2a-js/sdk/server/express";
import { buildCommerceAgentCard } from "./a2a/buildCommerceAgentCard";
import { CommerceAp2AgentExecutor } from "./a2a/commerceAgentExecutor";

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.resolve(process.cwd(), "public")));
const resumeBase = (process.env.RESUME_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-A2A-Extensions");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

async function proxyJson(req: express.Request, res: express.Response, targetPath: string): Promise<void> {
  try {
    const upstream = await fetch(`${resumeBase}${targetPath}`, {
      method: req.method,
      headers: { "Content-Type": req.headers["content-type"] || "application/json" },
      body: req.method === "GET" ? undefined : JSON.stringify(req.body)
    });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get("content-type") || "application/json").send(text);
  } catch (error) {
    res.status(502).json({
      error: "Resume API is not reachable from A2A server.",
      details: (error as Error).message
    });
  }
}

app.get("/api/activity", (req, res) => {
  void proxyJson(req, res, "/api/activity");
});

app.post("/api/optimize", (req, res) => {
  void proxyJson(req, res, "/api/optimize");
});

app.post("/api/extract-text", async (req, res) => {
  try {
    const upstream = await fetch(`${resumeBase}/api/extract-text`, {
      method: "POST",
      headers: req.headers as Record<string, string>,
      // multer endpoint expects multipart body; forwarding raw stream
      body: req as unknown as BodyInit,
      duplex: "half"
    } as RequestInit & { duplex?: "half" });
    const text = await upstream.text();
    res.status(upstream.status).type(upstream.headers.get("content-type") || "application/json").send(text);
  } catch (error) {
    res.status(502).json({
      error: "Resume extract API is not reachable from A2A server.",
      details: (error as Error).message
    });
  }
});

app.get("/api/activity/stream", async (_req, res) => {
  try {
    const upstream = await fetch(`${resumeBase}/api/activity/stream`);
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (!upstream.body) {
      res.end();
      return;
    }
    Readable.fromWeb(upstream.body as unknown as NodeWebReadableStream).pipe(res);
  } catch (error) {
    res.status(502).json({
      error: "Resume activity stream is not reachable from A2A server.",
      details: (error as Error).message
    });
  }
});

const agentCard = buildCommerceAgentCard();
const requestHandler = new DefaultRequestHandler(
  agentCard,
  new InMemoryTaskStore(),
  new CommerceAp2AgentExecutor()
);

app.get("/a2a/jsonrpc", (_req, res) => {
  res.status(200).json({
    message: "A2A JSON-RPC endpoint is working. Use POST with JSON-RPC payload; browser GET is not supported.",
    method: "POST",
    endpoint: "/a2a/jsonrpc",
    ui: "/a2a-ui",
    example: {
      jsonrpc: "2.0",
      id: "demo-1",
      method: "message/send",
      params: {
        message: {
          kind: "message",
          messageId: "msg-1",
          role: "user",
          parts: [{ kind: "text", text: "Authorize up to $49.99 for Pro plan at merchant merc_acme." }]
        }
      }
    }
  });
});

app.get("/a2a/rest", (_req, res) => {
  res.status(200).json({
    message: "A2A REST adapter base route is active.",
    note: "Use the documented REST paths under /a2a/rest (for example /v1/card).",
    hint: "Open /.well-known/agent-card.json for agent metadata."
  });
});

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use("/a2a/jsonrpc", jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));
app.use("/a2a/rest", restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

app.get("/", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "a2a.html"));
});

app.get("/a2a-ui", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "a2a.html"));
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "agents.html"));
});

app.get("/agents", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "agents.html"));
});

app.get("/movie-agent", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "movie-agent.html"));
});

app.get("/resume-agent", (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
});

const port = Number(process.env.A2A_PORT || 41242);

app.listen(port, () => {
  console.info(`[A2A Commerce+AP2] listening on http://localhost:${port}`);
  console.info(`[A2A Commerce+AP2] Agent card: http://localhost:${port}/.well-known/agent-card.json`);
  console.info(`[A2A Commerce+AP2] JSON-RPC: http://localhost:${port}/a2a/jsonrpc`);
  console.info(`[A2A Commerce+AP2] REST adapter: http://localhost:${port}/a2a/rest`);
});
