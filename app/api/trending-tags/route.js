/**
 * GET /api/trending-tags
 *
 * Returns up to 20 tags for the carousel, merged from 3 signals:
 *   1. Seasonal event tags (month-based, zero DB cost)
 *   2. Trending tags (most-visited wheels in last 7 days → their tags)
 *   3. Popular tags (most-used tags across all wheels — fallback/fill)
 *
 * Each tag: { name: string, type: "seasonal" | "trending" | "popular" }
 *
 * Cached at CDN edge for 24 hours (revalidate = 86400).
 */

import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Visit from "@models/visit";

export const revalidate = 86400; // 24 hours

// ── 1. Seasonal calendar ─────────────────────────────────────────────────────
// month (1-indexed) → tags to inject.  Add new events as one-liners.
const SEASONAL = {
  1:  ["new-year"],
  2:  ["valentines"],
  3:  ["ipl", "cricket"],
  4:  ["ipl", "cricket"],
  5:  ["ipl"],
  6:  ["fifa", "summer"],
  7:  ["summer"],
  8:  ["back-to-school"],
  9:  ["back-to-school"],
  10: ["halloween"],
  11: ["thanksgiving", "black-friday"],
  12: ["christmas", "new-year"],
};

function getSeasonalTags() {
  const month = new Date().getMonth() + 1; // 1-12
  return (SEASONAL[month] || []).map((name) => ({ name, type: "seasonal" }));
}

// ── 2. Trending (last 7 days visits → tag frequency) ─────────────────────────
async function getTrendingTags(limit = 7) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await Visit.aggregate([
    // Recent visits only
    { $match: { visitedAt: { $gte: sevenDaysAgo } } },
    // Group by wheel, count visits
    { $group: { _id: "$wheelId", visitCount: { $sum: 1 } } },
    // Top 50 most-visited wheels as a candidate pool
    { $sort: { visitCount: -1 } },
    { $limit: 50 },
    // Join with Wheel to get tags
    {
      $lookup: {
        from: "wheels",
        localField: "_id",
        foreignField: "_id",
        as: "wheel",
      },
    },
    { $unwind: "$wheel" },
    // Only wheels that have tags
    { $match: { "wheel.tags": { $exists: true, $ne: [] } } },
    // Unwind tags, weight each tag by visit count
    { $unwind: "$wheel.tags" },
    {
      $group: {
        _id: "$wheel.tags",
        score: { $sum: "$visitCount" },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
  ]);

  return result.map((r) => ({ name: r._id, type: "trending" }));
}

// ── 3. Popular (most-used tags across all wheels) ────────────────────────────
async function getPopularTags(limit = 15) {
  const result = await Wheel.aggregate([
    { $match: { tags: { $exists: true, $ne: [] } } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $project: { name: "$_id", count: 1, _id: 0 } },
  ]);

  return result.map((r) => ({ name: r.name, type: "popular" }));
}

// ── Merge & deduplicate ──────────────────────────────────────────────────────
function formatLabel(name) {
  // "back-to-school" → "Back To School"
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export async function GET() {
  try {
    await connectMongoDB();

    const [seasonal, trending, popular] = await Promise.all([
      Promise.resolve(getSeasonalTags()),
      getTrendingTags(7),
      getPopularTags(15),
    ]);

    // Merge: seasonal first, then trending, then popular to fill
    const seen = new Set();
    const merged = [];

    for (const tag of [...seasonal, ...trending, ...popular]) {
      const key = tag.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        name: key,
        label: formatLabel(key),
        type: tag.type,
      });
      if (merged.length >= 20) break;
    }

    return NextResponse.json({ tags: merged });
  } catch (error) {
    console.error("GET /api/trending-tags error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
