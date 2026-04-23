import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import UnifiedList from "@models/unifiedlist";
import DecisionLog from "@models/decisionLog";
import User from "@models/user";

// Hard cap on the "recent decisions" window we scan for streak + monthly
// stats. Prevents unbounded scans for power users.
const DECISION_STATS_WINDOW_DAYS = 120;

/**
 * Compute decision streak — consecutive days (going backward from today)
 * that the user saved at least one decision.
 */
function computeStreak(daySet) {
  if (!daySet.size) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(today);

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Resolve Mongo userId from an already-fetched NextAuth session without
 * making a second getServerSession call.
 */
export async function resolveUserIdFromSession(session) {
  if (!session?.user) return null;

  if (session.user.id && mongoose.Types.ObjectId.isValid(session.user.id)) {
    return session.user.id;
  }

  if (!session.user.email) return null;
  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email })
    .select("_id")
    .lean();
  return user?._id?.toString() ?? null;
}

/**
 * Build the full dashboard payload for a given user.
 * Shared by the /api/dashboard route (client hydrate) and the server page
 * (SSR prefetch to eliminate the JS -> auth -> fetch waterfall).
 */
export async function buildDashboardData({ userId, email }) {
  await connectMongoDB();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const statsWindowStart = new Date(
    now.getTime() - DECISION_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );

  const [wheels, lists, decisions, statsDecisions, decisionsTotal] =
    await Promise.all([
      Wheel.aggregate([
        { $match: { createdBy: email } },
        { $sort: { updatedAt: -1 } },
        {
          $project: {
            title: 1,
            createdAt: 1,
            updatedAt: 1,
            segmentCount: { $size: { $ifNull: ["$data", []] } },
          },
        },
      ]),

      UnifiedList.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $sort: { updatedAt: -1 } },
        {
          $project: {
            name: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            itemCount: { $size: { $ifNull: ["$items", []] } },
          },
        },
      ]),

      DecisionLog.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),

      DecisionLog.find({
        userId,
        createdAt: { $gte: statsWindowStart },
      })
        .select("wheelTitle createdAt")
        .sort({ createdAt: -1 })
        .lean(),

      DecisionLog.countDocuments({ userId }),
    ]);

  const daySet = new Set();
  const wheelCounts = {};
  let decisionsThisMonth = 0;

  for (const d of statsDecisions) {
    const created = new Date(d.createdAt);
    daySet.add(created.toISOString().slice(0, 10));
    if (created >= monthStart) {
      decisionsThisMonth++;
      const key = d.wheelTitle || "Home Wheel";
      wheelCounts[key] = (wheelCounts[key] || 0) + 1;
    }
  }

  const mostSpunWheelEntry = Object.entries(wheelCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  const stats = {
    decisionsThisMonth,
    decisionsTotal,
    mostSpunWheel: mostSpunWheelEntry
      ? { name: mostSpunWheelEntry[0], count: mostSpunWheelEntry[1] }
      : null,
    streak: computeStreak(daySet),
  };

  return {
    wheels: wheels.map((w) => ({
      _id: w._id.toString(),
      title: w.title,
      segmentCount: w.segmentCount ?? 0,
      updatedAt: w.updatedAt,
    })),
    lists: lists.map((l) => ({
      id: l._id.toString(),
      name: l.name,
      itemCount: l.itemCount ?? 0,
      updatedAt: l.updatedAt,
    })),
    decisions: decisions.map((d) => ({
      ...d,
      _id: d._id?.toString?.() ?? d._id,
    })),
    stats,
  };
}
