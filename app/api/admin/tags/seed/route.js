/**
 * POST /api/admin/tags/seed
 *
 * One-time (and safe-to-re-run) endpoint that populates the Tag collection
 * from existing Wheel.tags data.
 *
 * For each unique lowercase tag string found in wheels:
 *   - Creates a Tag doc with slug = tag, displayName = Title Case, wheelCount
 *   - Uses upsert so re-running is idempotent (won't overwrite manual edits
 *     to displayName or aliases that were set after the first seed).
 *
 * Admin-only: requires ADMIN_SEED_SECRET header to match ADMIN_SECRET env var.
 *
 * Usage:
 *   curl -X POST https://spinpapa.com/api/admin/tags/seed \
 *     -H "x-admin-secret: YOUR_SECRET"
 */

import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Tag from "@models/tag";

function toDisplayName(slug) {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function POST(request) {
  const secret = request.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectMongoDB();

    // Aggregate wheel counts per tag
    const wheelCounts = await Wheel.aggregate([
      { $match: { tags: { $exists: true, $ne: [] } } },
      { $unwind: "$tags" },
      { $group: { _id: { $toLower: "$tags" }, wheelCount: { $sum: 1 } } },
    ]);

    // Create tag map with wheel counts only
    const tagMap = new Map();
    for (const { _id, wheelCount } of wheelCounts) {
      if (!_id) continue;
      tagMap.set(_id, { wheelCount });
    }

    // Upsert each tag — $setOnInsert preserves manual edits on subsequent runs
    const ops = Array.from(tagMap.entries()).map(([slug, { wheelCount }]) => ({
      updateOne: {
        filter: { slug },
        update: {
          $setOnInsert: {
            displayName: toDisplayName(slug),
            aliases: [],
            description: "",
            thumbnailUrl: "",
            isPublic: true,
          },
          $set: { wheelCount },
        },
        upsert: true,
      },
    }));

    if (ops.length === 0) {
      return NextResponse.json({ message: "No tags found in wheels.", upserted: 0 });
    }

    const result = await Tag.bulkWrite(ops, { ordered: false });

    return NextResponse.json({
      message: "Tag collection seeded successfully.",
      total: tagMap.size,
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error("[tags/seed] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
