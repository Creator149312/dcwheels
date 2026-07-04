import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import DecisionLog from "@models/decisionLog";
import Post from "@models/post";
import User from "@models/user";
import Reaction from "@models/reaction";
import { getFeedItems } from "./feedService";

/**
 * Fetches the most-recent public saved decisions for a wheel, joined with
 * the author's display name so the feed can render "{name} got {result}".
 *
 * Returns serializable plain objects suitable for both the JSON API and
 * SSR seeding (no Mongoose docs leak through). Callers always get an
 * array — empty for fresh wheels — so consumers don't need null-guards.
 *
 * Implementation notes:
 *   - The `{ wheelId, isPublic, createdAt }` compound index on DecisionLog
 *     fully covers this query — match + sort come from the index, no
 *     in-memory sort even at scale.
 *   - We do a single `User.find({ _id: { $in: ... } })` for the join
 *     instead of N lookups. With limit=10 the IN list is tiny.
 *   - The `wheelId` field in DecisionLog is a String (legacy), so we
 *     match by string. We DO accept ObjectId-shaped inputs too — the
 *     caller may pass either form depending on the route.
 */
export async function getPublicSpinStoriesForWheel(wheelId, limit = 10) {
  if (!wheelId) return [];
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 10));
  const wheelIdStr = String(wheelId);

  const rows = await DecisionLog.find({
    wheelId: wheelIdStr,
    isPublic: true,
  })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select("userId result resultImage note createdAt")
    .lean();

  if (rows.length === 0) return [];

  // Resolve display names in one round-trip. Some legacy rows may have
  // a userId that no longer points at a real user (account deleted) —
  // those fall back to "Someone" so the feed doesn't break.
  const userIds = [
    ...new Set(
      rows
        .map((r) => r.userId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select("name")
        .lean()
    : [];

  const nameById = new Map(users.map((u) => [String(u._id), u.name || ""]));

  return rows.map((r) => ({
    id: String(r._id),
    userName: nameById.get(String(r.userId)) || "Someone",
    result: r.result,
    resultImage: r.resultImage || "",
    note: r.note || "",
    createdAt: r.createdAt
      ? new Date(r.createdAt).toISOString()
      : null,
  }));
}

/**
 * Fetches the most-recent public saved decisions across ALL wheels for a
 * single user, intended for their public profile timeline.
 * 
 * Uses the existing:
 *   `DecisionLogSchema.index({ userId: 1, createdAt: -1 })`
 */
export async function getPublicSpinStoriesForUser(userId, limit = 20, includePrivate = false) {
  if (!userId) return [];
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 20));
  const userIdStr = String(userId);

  const query = { userId: userIdStr };
  if (!includePrivate) {
    query.isPublic = true;
  }

  const rows = await DecisionLog.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .select("_id wheelId wheelTitle result resultImage note createdAt isPublic status")
    .lean();

  return rows.map((r) => {
    let finalWheelTitle = r.wheelTitle;
    if (!finalWheelTitle || finalWheelTitle === "A Wheel") {
      const wId = String(r.wheelId);
      if (wId.length === 24) {
        finalWheelTitle = "a custom wheel";
      } else if (wId === "home") {
        finalWheelTitle = "Spin Wheel";
      } else {
        finalWheelTitle = wId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    return {
      id: String(r._id),
      wheelId: String(r.wheelId),
      wheelTitle: finalWheelTitle,
      result: r.result,
      resultImage: r.resultImage || "",
      note: r.note || "",
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    };
  });
}

/**
 * Fetches the most recent public saved decisions globally across the entire platform.
 * Used for the main Activity Feed (Surface C).
 * 
 * Powered by:
 *   `DecisionLogSchema.index({ isPublic: 1, createdAt: -1 })`
 */
export async function getGlobalSpinStories(limit = 50, skip = 0) {
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const safeSkip = Math.max(0, Number(skip) || 0);

  const rows = await DecisionLog.find({ isPublic: true })
    .sort({ createdAt: -1 })
    .skip(safeSkip)
    .limit(safeLimit)
    .select("userId wheelId wheelTitle result resultImage note createdAt")
    .lean();

  if (rows.length === 0) return [];

  // Resolve display names in one round-trip
  const userIds = [
    ...new Set(
      rows
        .map((r) => r.userId)
        .filter((id) => id && mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } })
        .select("name")
        .lean()
    : [];

  const nameById = new Map(users.map((u) => [String(u._id), u.name || ""]));

  // Batch-fetch like counts for all stories in one aggregation — zero N+1.
  const rowIds = rows.map((r) => r._id);
  const likeCounts = await Reaction.aggregate([
    { $match: { entityType: "decisionLog", entityId: { $in: rowIds }, reactionType: "like" } },
    { $group: { _id: "$entityId", count: { $sum: 1 } } },
  ]);
  const likeCountById = new Map(likeCounts.map((l) => [String(l._id), l.count]));

  return rows.map((r) => {
    const userName = nameById.get(String(r.userId)) || "Someone";
    
    // Better fallback for wheel titles if the database row is old and missing it
    let finalWheelTitle = r.wheelTitle;
    if (!finalWheelTitle || finalWheelTitle === "A Wheel") {
      const wId = String(r.wheelId);
      if (wId.length === 24) {
        finalWheelTitle = "a custom wheel";
      } else if (wId === "home") {
        finalWheelTitle = "Spin Wheel";
      } else {
        // Convert slug to a readable title "my-wheel" -> "My Wheel"
        finalWheelTitle = wId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      }
    }

    return {
      id: String(r._id),
      userId: String(r.userId),
      userName,
      // Create a slugified username for correct profile link routing
      userSlug: encodeURIComponent(userName),
      wheelId: String(r.wheelId),
      wheelTitle: finalWheelTitle,
      result: r.result,
      resultImage: r.resultImage || "",
      note: r.note || "",
      likeCount: likeCountById.get(String(r._id)) || 0,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    };
  });
}

/**
 * Unified global feed — merges public Wheels and public Posts,
 * sorted chronologically newest-first.
 * 
 * Delegates to getFeedItems for consistency across the platform.
 */
export async function getGlobalFeedItems(limit = 8, lastTimestamp = null) {
  return getFeedItems({
    limit,
    lastTimestamp
  });
}
