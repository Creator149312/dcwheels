// GET /api/decisionlog/by-result?result=<name>
// Returns the most recent DecisionLog entry where the authenticated user's
// spin result matches the given string (case-insensitive exact match).
// Used by SpinHistoryBadge on slug pages to show "You spun to this from [Wheel]".
import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import DecisionLog from "@models/decisionLog";
import { sessionUserId } from "@utils/SessionData";

export const dynamic = "force-dynamic";

// Escape any regex metacharacters in the result string before passing to $regex.
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    // Not authenticated — return found:false quietly (not a 401) so the badge
    // simply stays hidden rather than triggering an error toast on the client.
    if (!userId) return NextResponse.json({ found: false });

    const { searchParams } = new URL(req.url);
    const result = searchParams.get("result");
    if (!result || result.length > 300) {
      return NextResponse.json({ found: false });
    }

    const log = await DecisionLog.findOne({
      userId,
      result: { $regex: new RegExp(`^${escapeRegex(result)}$`, "i") },
    })
      .sort({ createdAt: -1 }) // most recent spin wins
      .select("wheelId wheelTitle createdAt")
      .lean();

    if (!log) return NextResponse.json({ found: false });

    return NextResponse.json({
      found: true,
      wheelId:    log.wheelId,
      wheelTitle: log.wheelTitle || null,
      createdAt:  log.createdAt,
    });
  } catch (err) {
    console.error("GET /api/decisionlog/by-result error:", err);
    // Always 200 — a missing badge is better than a broken page.
    return NextResponse.json({ found: false });
  }
}
