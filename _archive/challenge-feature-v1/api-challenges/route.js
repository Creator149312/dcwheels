import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Challenge from "@models/challenge";
import UserBadge from "@models/userBadge";
import { sessionUserId } from "@utils/SessionData";

/**
 * GET /api/challenges
 * Returns all active challenges, optionally filtered by entityType or tier.
 * If the user is authenticated, each challenge includes `accepted` (bool)
 * and `completed` (bool) derived from their UserBadge records.
 *
 * Query params:
 *   entityType — filter by category (anime|movie|game|character|"")
 *   tier       — filter by tier (common|rare|epic)
 */
export async function GET(req) {
  try {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") ?? undefined;
    const tier       = searchParams.get("tier")       ?? undefined;

    const filter = { active: true };
    if (entityType !== undefined) filter.entityType = entityType;
    if (tier !== undefined) filter.tier = tier;

    const challenges = await Challenge.find(filter)
      .sort({ tier: 1, createdAt: -1 })
      .lean();

    // Attach per-user completion state when authenticated
    const userId = await sessionUserId();
    let badgeMap = {};
    if (userId) {
      const badges = await UserBadge.find({ userId }).select("challengeId").lean();
      badges.forEach((b) => {
        badgeMap[String(b.challengeId)] = true;
      });
    }

    const result = challenges.map((c) => ({
      ...c,
      completed: !!badgeMap[String(c._id)],
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/challenges error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
