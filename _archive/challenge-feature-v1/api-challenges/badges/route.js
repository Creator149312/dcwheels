import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import UserBadge from "@models/userBadge";
import User from "@models/user";
import { sessionUserId } from "@utils/SessionData";

/**
 * GET /api/challenges/badges
 * Returns the authenticated user's earned badges.
 *
 * GET /api/challenges/badges?username=xyz
 * Returns badges for a public profile (no auth required).
 */
export async function GET(req) {
  try {
    await connectMongoDB();
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    let targetUserId;
    if (username) {
      const user = await User.findOne({ name: username }).select("_id").lean();
      if (!user) return NextResponse.json([], { status: 200 });
      targetUserId = user._id;
    } else {
      targetUserId = await sessionUserId();
      if (!targetUserId) {
        return NextResponse.json({ error: "Sign in to view your badges." }, { status: 401 });
      }
    }

    const badges = await UserBadge.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(badges);
  } catch (err) {
    console.error("GET /api/challenges/badges error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
