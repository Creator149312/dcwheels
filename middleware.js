import { NextResponse } from "next/server";

// Simple in-process rate limiter — stops runaway client-side loops / accidental hammering.
// Note: in serverless environments each instance has its own memory, so this is a
// per-instance guard, not a distributed limiter. For stricter limits add Upstash Redis.

const RULES = [
  // Auth endpoints — tight limit
  { pattern: /^\/api\/auth\//, limit: 20, window: 60_000 },
  // Account mutations
  { pattern: /^\/api\/account\//, limit: 10, window: 60_000 },
  // Reaction / follow toggles
  { pattern: /^\/api\/reactiontest\/toggle/, limit: 60, window: 60_000 },
  { pattern: /^\/api\/follow/, limit: 30, window: 60_000 },
  // Visit tracking
  { pattern: /^\/api\/history\/visit/, limit: 60, window: 60_000 },
];

// Map<key, { count, resetAt }>
const store = new Map();

function getIp(req) {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

function isRateLimited(ip, path) {
  const now = Date.now();

  for (const rule of RULES) {
    if (!rule.pattern.test(path)) continue;

    const key = `${ip}:${rule.pattern.toString()}`;
    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + rule.window });
      return false;
    }

    if (entry.count >= rule.limit) return true;

    entry.count++;
    return false;
  }

  return false;
}

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const ip = getIp(req);

  if (isRateLimited(ip, pathname)) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests. Please slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/account/:path*",
    "/api/reactiontest/toggle",
    "/api/follow",
    "/api/history/visit",
  ],
};
