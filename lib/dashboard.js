import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import UnifiedList from "@models/unifiedlist";
import DecisionLog from "@models/decisionLog";
import User from "@models/user";

import { unstable_cache } from "next/cache";

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
  return unstable_cache(
    async () => {
      await connectMongoDB();

      const now = new Date();
      const statsWindowStart = new Date(
        now.getTime() - DECISION_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000
      );

      const [
        wheels,
        lists,
        decisions,
        statsDates,
        decisionsTotal,
        wheelsTotal,
        listsTotal,
      ] = await Promise.all([
        Wheel.aggregate([
          { $match: { createdBy: email } },
          { $sort: { createdAt: -1 } },
          { $limit: 5 },
          {
            $project: {
              title: 1,
              createdAt: 1,
              updatedAt: 1,
              isPublic: 1,
              segmentCount: { $size: { $ifNull: ["$data", []] } },
            },
          },
        ]),

        UnifiedList.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          { $sort: { _id: -1 } },
          { $limit: 5 },
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

        DecisionLog.find({ userId }).sort({ createdAt: -1 }).limit(5).lean(),

        // Just fetch the dates to keep memory & bandwidth extremely tiny
        DecisionLog.find({ userId, createdAt: { $gte: statsWindowStart } })
          .select("createdAt")
          .lean(),

        DecisionLog.countDocuments({ userId }),
        Wheel.countDocuments({ createdBy: email }),
        UnifiedList.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
      ]);

      const daySet = new Set();
      for (const d of statsDates) {
        daySet.add(new Date(d.createdAt).toISOString().slice(0, 10));
      }

      const stats = {
        decisionsTotal,
        wheelsTotal,
        listsTotal,
        streak: computeStreak(daySet),
      };

      return {
        wheels: wheels.map((w) => ({
          _id: w._id.toString(),
          title: w.title,
          segmentCount: w.segmentCount ?? 0,
          isPublic: w.isPublic ?? false,
          updatedAt: w.updatedAt ? w.updatedAt.toISOString() : null,
        })),
        lists: lists.map((l) => ({
          id: l._id.toString(),
          name: l.name,
          itemCount: l.itemCount ?? 0,
          updatedAt: l.updatedAt ? l.updatedAt.toISOString() : null,
        })),
        decisions: decisions.map((d) => {
          let title = d.wheelTitle;
          const wId = String(d.wheelId || "home");
          if (!title || title === "A Wheel") {
            if (wId.length === 24) {
              title = "A Custom Wheel";
            } else if (wId === "home") {
              title = "Home Wheel";
            } else {
              title = wId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            }
          }
          return {
            ...d,
            wheelTitle: title,
            _id: d._id?.toString?.() ?? d._id,
            createdAt: d.createdAt ? d.createdAt.toISOString() : null,
          };
        }),
        stats,
      };
    },
    ["dashboard-main", userId, email],
    { revalidate: 30, tags: ["dashboard"] }
  )();
}

/**
 * Fetch all wheels for a user for the /dashboard/wheels dedicated page.
 */
export async function getDashboardWheels(email) {
  return unstable_cache(
    async () => {
      await connectMongoDB();
      const wheels = await Wheel.aggregate([
        { $match: { createdBy: email } },
        { $sort: { createdAt: -1 } },
        {
          $project: {
            title: 1,
            createdAt: 1,
            updatedAt: 1,
            isPublic: 1,
            segmentCount: { $size: { $ifNull: ["$data", []] } },
          },
        },
      ]);
      return wheels.map((w) => ({
        _id: w._id.toString(),
        title: w.title,
        segmentCount: w.segmentCount ?? 0,
        isPublic: w.isPublic ?? false,
        updatedAt: w.updatedAt ? w.updatedAt.toISOString() : null,
      }));
    },
    ["dashboard-wheels", email],
    { revalidate: 60, tags: ["dashboard"] }
  )();
}

/**
 * Fetch all lists for a user for the /dashboard/lists dedicated page.
 */
export async function getDashboardLists(userId) {
  return unstable_cache(
    async () => {
      await connectMongoDB();
      const lists = await UnifiedList.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        { $sort: { _id: -1 } },
        {
          $project: {
            name: 1,
            description: 1,
            createdAt: 1,
            updatedAt: 1,
            itemCount: { $size: { $ifNull: ["$items", []] } },
          },
        },
      ]);
      return lists.map((l) => ({
        id: l._id.toString(),
        name: l.name,
        itemCount: l.itemCount ?? 0,
        updatedAt: l.updatedAt ? l.updatedAt.toISOString() : null,
      }));
    },
    ["dashboard-lists", userId],
    { revalidate: 60, tags: ["dashboard"] }
  )();
}

/**
 * Fetch all decisions for a user for the /dashboard/decisions dedicated page.
 */
export async function getDashboardDecisions(userId) {
  return unstable_cache(
    async () => {
      await connectMongoDB();
      const decisions = await DecisionLog.find({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return decisions.map((d) => {
        let title = d.wheelTitle;
        const wId = String(d.wheelId || "home");
        if (!title || title === "A Wheel") {
          if (wId.length === 24) {
            title = "A Custom Wheel";
          } else if (wId === "home") {
            title = "Home Wheel";
          } else {
            title = wId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          }
        }
        return {
          _id: d._id.toString(),
          wheelId: d.wheelId,
          wheelTitle: title,
          result: d.result,
          status: d.status,
          resultImage: d.resultImage,
          note: d.note,
          createdAt: d.createdAt ? d.createdAt.toISOString() : null,
        };
      });
    },
    ["dashboard-decisions", userId],
    { revalidate: 60, tags: ["dashboard"] }
  )();
}
