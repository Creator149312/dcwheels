import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import UnifiedList from "@models/unifiedlist";
import DecisionLog from "@models/decisionLog";

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
 * Build the full dashboard payload for a given user.
 * Used by the profile page (SSR prefetch to eliminate the JS -> auth -> fetch waterfall).
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
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
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
          { $match: { userId: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true } } },
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
        Wheel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
        UnifiedList.countDocuments({ userId: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true } }),
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
          slug: l.slug || "",
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
    ["profile-main", userId, email],
    { revalidate: 30, tags: ["profile"] }
  )();
}

/**
 * Fetch wheels for profile view, with optional onlyPublic filter
 */
export async function getProfileWheels(userId, onlyPublic = false) {
  await connectMongoDB();
  const query = { userId: new mongoose.Types.ObjectId(userId) };
  if (onlyPublic) {
    query.isPublic = true;
  }
  const wheels = await Wheel.aggregate([
    { $match: query },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        title: 1,
        description: 1,
        tags: 1,
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
    description: w.description || "",
    tags: w.tags || [],
    segmentCount: w.segmentCount ?? 0,
    isPublic: w.isPublic ?? false,
    updatedAt: w.updatedAt ? w.updatedAt.toISOString() : null,
    createdAt: w.createdAt ? w.createdAt.toISOString() : null,
  }));
}

/**
 * Fetch lists for profile view, with optional onlyPublic filter
 */
export async function getProfileLists(userId, onlyPublic = false) {
  await connectMongoDB();
  const query = { userId: new mongoose.Types.ObjectId(userId), isDeleted: { $ne: true } };
  if (onlyPublic) {
    query.isPublic = true;
  }
  const lists = await UnifiedList.aggregate([
    { $match: query },
    { $sort: { _id: -1 } },
    {
      $project: {
        name: 1,
        slug: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        isPublic: 1,
        isSystem: 1,
        itemCount: { $size: { $ifNull: ["$items", []] } },
      },
    },
  ]);
  return lists.map((l) => ({
    id: l._id.toString(),
    name: l.name,
    slug: l.slug || "",
    isPublic: l.isPublic ?? false,
    isSystem: l.isSystem ?? false,
    itemCount: l.itemCount ?? 0,
    updatedAt: l.updatedAt ? l.updatedAt.toISOString() : null,
  }));
}


