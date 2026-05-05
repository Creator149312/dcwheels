/**
 * Tag autocomplete for the save-wheel tag input.
 *
 * GET /api/tags/autocomplete?q=adv     → { tags: [{ name, count }, ...] }
 *
 * Behaviour:
 *   - Requires q.length >= 1. Returns empty list for shorter queries.
 *   - Case-insensitive prefix match against the existing lowercased,
 *     indexed `wheels.tags` field.
 *   - Returns at most 10 tags, ranked by popularity (wheel count desc).
 *   - Public, read-only, no auth required.
 *
 * Cost:
 *   - One aggregation per request. The `{ tags: 1 }` multikey index is
 *     used for $match, $unwind fans out, $group counts, $sort by count
 *     uses an in-memory sort of a small set (prefix match is already
 *     narrow). Fine at millions of wheels.
 */

import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import Tag from "@models/tag";

const MAX_RESULTS = 10;
const MAX_Q_LEN = 40;

// Escape user-provided text so it's safe inside a regex literal.
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const qRaw = (searchParams.get("q") || "").trim();
  const q = qRaw.slice(0, MAX_Q_LEN).toLowerCase();

  if (q.length === 0) {
    return NextResponse.json({ tags: [] });
  }

  try {
    await connectMongoDB();

    const prefix = new RegExp("^" + escapeRegex(q));

    // Primary: query Tag collection for canonical slugs and display names.
    // This uses the registered aliases so "scary-m" surfaces "horror-movies".
    const tagDocs = await Tag.find({
      isPublic: true,
      $or: [
        { slug: prefix },
        { displayName: new RegExp(escapeRegex(q), "i") },
        { aliases: prefix },
      ],
    })
      .sort({ wheelCount: -1 })
      .limit(MAX_RESULTS)
      .select("slug displayName wheelCount")
      .lean();

    if (tagDocs.length > 0) {
      const results = tagDocs.map((t) => ({
        name: t.slug,
        displayName: t.displayName,
        count: t.wheelCount,
      }));
      return NextResponse.json({ tags: results });
    }

    // Fallback: Tag collection empty (pre-seed) — aggregate raw Wheel.tags.
    const results = await Wheel.aggregate([
      { $match: { tags: prefix } },
      { $unwind: "$tags" },
      { $match: { tags: prefix } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: MAX_RESULTS },
      { $project: { _id: 0, name: "$_id", count: 1 } },
    ]);

    return NextResponse.json({ tags: results });
  } catch (err) {
    console.error("[tags/autocomplete] failed:", err);
    return NextResponse.json({ tags: [], error: "Autocomplete failed" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
