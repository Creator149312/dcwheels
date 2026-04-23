// In-process rate limiter.
//
// Previously this module hit MongoDB on every request (one findOneAndUpdate,
// sometimes a follow-up updateOne + upsert). That doubled the DB write
// volume on hot paths like /api/track-view, /api/reactiontest/toggle and
// /api/history/visit — each of which already does its own real write.
//
// A per-instance in-memory Map is good enough for abuse prevention:
//   • On Vercel, each serverless instance warm-lives for a few minutes and
//     handles many requests; an attacker hitting the same IP hard from one
//     client will reuse the same instance most of the time.
//   • If traffic is sharded across N instances, each instance sees 1/N of
//     that IP's requests, so the effective cap is N × limit. That's still
//     a cap — scrapers and accidental loops are blocked, which is the
//     point. The limits below already include plenty of headroom.
//   • For stricter cross-instance limits switch to Upstash / Vercel KV
//     (same interface — just replace the Map with kv.incr + kv.pexpire).
//
// Memory footprint: each entry is ~80 bytes; at 100k distinct (ip,rule)
// keys that's ~8MB. We prune on access so idle keys fall off.

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

// Map<string, { count: number, resetAt: number }>
// Lives on globalThis so it survives Next.js hot reloads in dev and
// is shared across all route modules within one serverless instance.
const store =
  globalThis.__rateLimitStore || (globalThis.__rateLimitStore = new Map());

// Cap map size to prevent unbounded growth from scanners hitting unique IPs.
// When the cap is hit we drop a handful of oldest entries. This is O(1)
// amortized because Map preserves insertion order.
const MAX_ENTRIES = 50_000;

function pruneIfNeeded() {
  if (store.size < MAX_ENTRIES) return;
  const toDrop = Math.ceil(MAX_ENTRIES * 0.1);
  let i = 0;
  for (const k of store.keys()) {
    store.delete(k);
    if (++i >= toDrop) break;
  }
}

export function getIpFromRequest(req) {
  const forwarded =
    req.headers?.get?.("x-forwarded-for") ||
    req.headers?.["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return "unknown";
}

/**
 * Returns { limited: false } or { limited: true, retryAfter: <seconds> }.
 * Synchronous under the hood but kept async for signature compatibility
 * with the previous Mongo-backed implementation — callers already await it.
 */
export async function checkRateLimit(ip, path) {
  const rule = RULES.find((r) => r.pattern.test(path));
  if (!rule) return { limited: false };

  const key = `${ip}:${rule.pattern.source}`;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // No active window, or the previous window expired — start fresh.
    pruneIfNeeded();
    store.set(key, { count: 1, resetAt: now + rule.window });
    return { limited: false };
  }

  entry.count++;
  if (entry.count > rule.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
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
