// Shared gate for /api/ai/* routes.
//
// Each AI route hits OpenAI which costs real money per call. Two layers:
//   1. require an authenticated session — no anonymous burn
//   2. per-IP rate limit (the global /api/ai/ rule in lib/rateLimit.js)
//
// Returns a NextResponse to short-circuit, or null to continue.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import {
  checkRateLimit,
  getIpFromRequest,
  rateLimitResponse,
} from "@lib/rateLimit";

export async function aiGate(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { error: "Sign in to use AI features." },
      { status: 401 }
    );
  }

  const ip = getIpFromRequest(req);
  const { limited, retryAfter } = await checkRateLimit(ip, "/api/ai/");
  if (limited) return rateLimitResponse(retryAfter);

  return null;
}
