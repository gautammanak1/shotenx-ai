import "./loadEnv";
import app from "./app";
import { logActivity } from "./activityStream";

const port = Number(process.env.PORT || 3000);

const asiOneApiKey = (process.env.ASI_ONE_API_KEY || "").trim();
const asiOneBaseUrl = (process.env.ASI_ONE_BASE_URL || "").trim();
const placeholderKey = "PASTE_YOUR_ASI_ONE_API_KEY_HERE";

if (!asiOneApiKey || asiOneApiKey === placeholderKey) {
  console.warn(
    "[Startup] ASI_ONE_API_KEY is not set. /api/optimize requests will fail until it is configured."
  );
  logActivity(
    "Startup",
    "ASI_ONE_API_KEY is not set. /api/optimize will fail until configured.",
    "error"
  );
}

if (!asiOneBaseUrl) {
  console.warn(
    "[Startup] ASI_ONE_BASE_URL is not set. /api/optimize requests will fail until it is configured."
  );
  logActivity(
    "Startup",
    "ASI_ONE_BASE_URL is not set. /api/optimize will fail until configured.",
    "error"
  );
}

app.listen(port, () => {
  console.info(`[Startup] JobApplicationOptimizerAgent API listening on port ${port}`);
  logActivity("Startup", `API listening on port ${port}.`);
});
