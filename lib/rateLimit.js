import { connectMongoDB } from "@lib/mongodb";
import RateLimit from "@models/ratelimit";

const RULES = [
  { pattern: /^\/api\/account\//, limit: 10, window: 60_000 },
  { pattern: /^\/api\/reactiontest\/toggle/, limit: 60, window: 60_000 },
  { pattern: /^\/api\/follow/, limit: 30, window: 60_000 },
  { pattern: /^\/api\/history\/visit/, limit: 60, window: 60_000 },

  // Writes that create blob-storage artefacts. Aggressive cap — abusive
  // uploads are the single most expensive write path (sharp re-encode +
  // blob bandwidth + storage).
  { pattern: /^\/api\/upload\//, limit: 20, window: 60_000 },

  // Public read endpoints — cache layer absorbs most load, but a scraper
  // hitting with cache-busting query params could still thrash Atlas
  // Search. Per-IP cap is a cheap backstop.
  { pattern: /^\/api\/wheel\/search\//, limit: 120, window: 60_000 },
  { pattern: /^\/api\/track-view/, limit: 120, window: 60_000 },
];

export function getIpFromRequest(req) {
  const forwarded =
    req.headers?.get?.("x-forwarded-for") ||
    req.headers?.["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return "unknown";
}

/**
 * Returns { limited: false } or { limited: true, retryAfter: <seconds> }
 * Connects to MongoDB internally — safe to call from any API route.
 */
export async function checkRateLimit(ip, path) {
  const rule = RULES.find((r) => r.pattern.test(path));
  if (!rule) return { limited: false };

  await connectMongoDB();

  const key = `${ip}:${rule.pattern.source}`;
  const now = new Date();

  // Atomically increment count for the active window
  const entry = await RateLimit.findOneAndUpdate(
    { key, resetAt: { $gt: now } },
    { $inc: { count: 1 } },
    { new: true }
  );

  if (!entry) {
    // No active window — start a fresh one
    await RateLimit.updateOne(
      { key },
      { $set: { count: 1, resetAt: new Date(now.getTime() + rule.window) } },
      { upsert: true }
    );
    return { limited: false };
  }

  if (entry.count > rule.limit) {
    const retryAfter = Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000);
    return { limited: true, retryAfter };
  }

  return { limited: false };
}

/**
 * Helper: return a 429 response from an API route.
 */
export function rateLimitResponse(retryAfter = 60) {
  const { NextResponse } = require("next/server");
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfter), "Content-Type": "application/json" },
    }
  );
}
