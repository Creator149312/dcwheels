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

    // Pipeline:
    //   1. $match narrows to wheels containing at least one tag starting
    //      with the prefix. Uses the { tags: 1 } index.
    //   2. $unwind fans out each wheel's tags.
    //   3. $match again on the individual tag level — drops non-matching
    //      tags that rode along on a matched wheel.
    //   4. $group counts wheels per tag.
    //   5. $sort by popularity.
    //   6. $limit small.
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
