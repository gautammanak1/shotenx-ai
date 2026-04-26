import { Router, Request, Response } from "express";
import { jobApplicationOptimizer } from "../agents/jobOptimizer";
import { JobOptimizerInput } from "../types";
import { logActivity } from "../activityStream";

const optimizeRouter = Router();

function isValidInput(body: Partial<JobOptimizerInput>): body is JobOptimizerInput {
  return (
    typeof body.resume === "string" &&
    body.resume.trim().length > 0 &&
    typeof body.job_description === "string" &&
    body.job_description.trim().length > 0
  );
}

optimizeRouter.post("/", async (req: Request, res: Response) => {
  try {
    const payload = req.body as Partial<JobOptimizerInput>;

    if (!isValidInput(payload)) {
      logActivity(
        "API",
        "Rejected optimize request because resume or job_description was missing.",
        "error"
      );
      return res.status(400).json({
        error:
          "Invalid input. Expected { resume: string, job_description: string } with non-empty values."
      });
    }

    console.info("[API] /api/optimize request received");
    logActivity("API", "Received optimize request.");

    const result = await jobApplicationOptimizer(payload);
    logActivity("API", "Optimization completed successfully.");

    return res.status(200).json(result);
  } catch (error) {
    const message = (error as Error).message;
    console.error("[API] /api/optimize failed:", message);
    logActivity("API", `Optimization failed: ${message}`, "error");

    if (message.includes("parse model response")) {
      return res.status(502).json({
        error: "Model returned invalid JSON.",
        details: message
      });
    }

    return res.status(500).json({
      error: "Internal server error.",
      details: message
    });
  }
});

export default optimizeRouter;
