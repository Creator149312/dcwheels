// GET /api/auth/me
// Returns the authenticated user's MongoDB id using the full server-side
// session resolution (including email-based fallback for older JWT tokens
// that predate the mongoId field).
//
// Used by ListDetailClient to determine ownership when the client-side
// session token lacks `user.id` (old sessions).
import { NextResponse } from "next/server";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await sessionUserId();
  return NextResponse.json({ userId: userId?.toString() ?? null });
}
