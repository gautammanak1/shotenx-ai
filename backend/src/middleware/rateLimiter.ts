import type { Request, RequestHandler } from "express";

export type RateLimiterOptions = {
  scope: string;
  capacity: number;
  windowMs: number;
};

function clientKey(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const buyer =
    req.body && typeof (req.body as { buyerId?: unknown }).buyerId === "string"
      ? (req.body as { buyerId: string }).buyerId
      : "";
  return `${ip}|${buyer}`;
}

/** Sliding-window limiter per scope + IP (+ buyerId when present on JSON body). */
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const buckets = new Map<string, number[]>();
  const pruneEvery = Math.max(options.windowMs, 60_000);
  let lastPrune = Date.now();

  return (req, res, next) => {
    const now = Date.now();
    if (now - lastPrune > pruneEvery) {
      lastPrune = now;
      for (const [k, stamps] of buckets) {
        const kept = stamps.filter((t) => now - t < options.windowMs);
        if (kept.length === 0) buckets.delete(k);
        else buckets.set(k, kept);
      }
    }

    const key = `${options.scope}:${clientKey(req)}`;
    let stamps = buckets.get(key) ?? [];
    stamps = stamps.filter((t) => now - t < options.windowMs);

    if (stamps.length >= options.capacity) {
      res.status(429).json({
        error: "rate_limited",
        scope: options.scope,
        retryAfterMs: options.windowMs
      });
      return;
    }

    stamps.push(now);
    buckets.set(key, stamps);
    next();
  };
}
