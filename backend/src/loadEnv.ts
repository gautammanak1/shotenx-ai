import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { logActivity } from "./activityStream";

/**
 * Load `.env` before other modules read `process.env`.
 * Tries `cwd` first, then project root next to `src/` (reliable under `tsx watch`).
 */
function resolveEnvPath(): string | undefined {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "..", ".env")
  ];
  return candidates.find((p) => existsSync(p));
}

const envPath = resolveEnvPath();

if (envPath) {
  let content = readFileSync(envPath, "utf8");
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }
  const parsed = dotenv.parse(content);
  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }
  logActivity("Startup", `Loaded environment variables from ${envPath}.`);
} else {
  dotenv.config();
}
