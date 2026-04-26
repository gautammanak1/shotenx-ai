import "dotenv/config";
import path from "node:path";
import cors from "cors";
import express from "express";
import { agentRoutes } from "./routes/agentRoutes";
import { agentverseChatRoutes } from "./routes/agentverseChatRoutes";
import { albyProxyRoutes } from "./routes/albyProxyRoutes";
import { marketLlmAliasRoutes } from "./routes/marketLlmAliasRoutes";
import { mdkStubRoutes } from "./routes/mdkStubRoutes";
import { paymentRoutes } from "./routes/paymentRoutes";
import { premiumRoutes } from "./routes/premiumRoutes";
import { toolRoutes } from "./routes/toolRoutes";

const app = express();
const port = Number(process.env.PORT ?? 8080);
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS ??
  process.env.ALLOWED_ORIGIN ??
  "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin: string) =>
  /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+):\d+$/.test(origin);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    service: "shotenx-ai-backend",
    status: "ok",
    paymentRail: "lightning",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/agents", agentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/tools", toolRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api", agentverseChatRoutes);
app.use("/api/alby", albyProxyRoutes);
app.use("/api/mdk", mdkStubRoutes);
app.use("/api/market", marketLlmAliasRoutes);

const publicDir = path.join(process.cwd(), "public");
app.get(["/app", "/app/"], (_req, res) => {
  res.sendFile(path.join(publicDir, "server-app.html"));
});

app.listen(port, () => {
  console.log(`ShotenX backend running on http://localhost:${port}`);
});
