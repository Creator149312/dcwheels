import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import DecisionLog from "@models/decisionLog";
import Challenge from "@models/challenge";
import { sessionUserId } from "@utils/SessionData";

/**
 * GET /api/challenges/active
 * Returns any "pending" decisions for this user that were tied to a challenge.
 * This lets users who spun the wheel but haven't taken the quiz yet come back
 * the next day to verify.
 */
export async function GET() {
  try {
    await connectMongoDB();
    const userId = await sessionUserId();
    if (!userId) return NextResponse.json([]); // Only logged in users

    // Find any unverified spins that were linked to a challenge
    const pendingLogs = await DecisionLog.find({
      userId,
      status: "pending",
      challengeId: { $ne: null }
    })
      .sort({ createdAt: -1 })
      .populate("challengeId")
      .lean();

    // Map them into a UI-friendly list
    const activeQuests = pendingLogs
      .filter((log) => log.challengeId) // Filter out if challenge was deleted
      .map((log) => ({
        decisionLogId: log._id.toString(),
        result: log.result,
        createdAt: log.createdAt,
        challenge: {
          ...log.challengeId,
          _id: log.challengeId._id.toString(),
        }
      }));

    return NextResponse.json(activeQuests);

  } catch (err) {
    console.error("GET /api/challenges/active error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
