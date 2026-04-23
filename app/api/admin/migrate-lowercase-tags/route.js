/**
 * Admin API for the one-shot "lowercase tags + TopicPage dedupe" migration.
 *
 * Staged migration — each stage is a separate POST action so the admin UI
 * can run them one-by-one with explicit confirmations:
 *
 *   action=check-duplicates    Find duplicate (type, relatedId) TopicPages
 *                              that would break the new unique index.
 *
 *   action=dedupe-topicpages   Keep the oldest doc per (type, relatedId),
 *                              delete the rest. Only allowed after check
 *                              was called and duplicates were surfaced.
 *
 *   action=dry-run-wheels      Count wheels/tags that contain uppercase
 *                              characters — no writes.
 *
 *   action=backfill-wheels     Lowercase + trim every tag on every wheel
 *                              using a single aggregation-pipeline update.
 *                              Safe against the currently-live code because
 *                              the live query uses case-insensitive regex.
 *
 *   action=verify              Final sanity check: zero uppercase tags left,
 *                              zero TopicPage duplicates left.
 *
 * Access: restricted to ADMIN_EMAIL (same pattern as other admin routes).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import TopicPage from "@models/topicpage";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return !!(session && session.user.email === ADMIN_EMAIL);
}

// ── Stage 1: detect TopicPage duplicates ────────────────────────────────────
async function checkDuplicates() {  const total = await TopicPage.countDocuments({});
  console.log(`[migrate] Stage 1 (check-duplicates): scanning ${total} TopicPage docs…`);
  const dupes = await TopicPage.aggregate([
    {
      $group: {
        _id: { type: "$type", relatedId: "$relatedId" },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
        createdAts: { $push: "$createdAt" },
        slugs: { $push: "$slug" },
      },
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 200 },
  ]);

  const totalExtraDocs = dupes.reduce((sum, d) => sum + (d.count - 1), 0);
  console.log(
    `[migrate] Stage 1 done: scanned ${total} docs → ${dupes.length} duplicate groups, ${totalExtraDocs} extra docs`
  );

  return {
    scannedDocs: total,
    duplicateGroups: dupes.length,
    totalExtraDocs,
    samples: dupes.slice(0, 20).map((d) => ({
      type: d._id.type,
      relatedId: d._id.relatedId,
      count: d.count,
      ids: d.ids.map(String),
      slugs: d.slugs,
    })),
  };
}

// ── Stage 2: dedupe — keep oldest, delete rest ──────────────────────────────
async function dedupeTopicPages() {
  const totalBefore = await TopicPage.countDocuments({});
  console.log(`[migrate] Stage 2 (dedupe-topicpages): starting; ${totalBefore} docs before`);

  const dupes = await TopicPage.aggregate([
    {
      $group: {
        _id: { type: "$type", relatedId: "$relatedId" },
        docs: { $push: { id: "$_id", createdAt: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  let deleted = 0;
  const kept = [];
  const deletedIds = [];

  for (const [i, group] of dupes.entries()) {
    // Oldest createdAt wins (most likely to have accumulated questions/votes).
    const sorted = [...group.docs].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const keep = sorted[0];
    const losers = sorted.slice(1).map((d) => d.id);

    if (losers.length === 0) continue;

    const result = await TopicPage.deleteMany({ _id: { $in: losers } });
    deleted += result.deletedCount || 0;
    kept.push({ type: group._id.type, relatedId: group._id.relatedId, keptId: String(keep.id) });
    deletedIds.push(...losers.map(String));

    console.log(
      `[migrate] Stage 2: group ${i + 1}/${dupes.length} (${group._id.type}:${group._id.relatedId}) — kept ${keep.id}, deleted ${losers.length}`
    );
  }

  const totalAfter = await TopicPage.countDocuments({});
  console.log(
    `[migrate] Stage 2 done: processed ${dupes.length} groups, deleted ${deleted} docs (${totalBefore} → ${totalAfter})`
  );

  return {
    totalBefore,
    totalAfter,
    groupsProcessed: dupes.length,
    docsDeleted: deleted,
    kept,
    deletedIds,
  };
}

// ── Stage 3: dry-run — count uppercase tags without touching data ───────────
async function dryRunWheels() {
  console.log("[migrate] Stage 3 (dry-run-wheels): scanning wheels…");

  const [totalWheels, wheelsWithUppercase, tagsBreakdown] = await Promise.all([
    Wheel.countDocuments({}),
    Wheel.countDocuments({
      tags: { $elemMatch: { $regex: /[A-Z]/ } },
    }),
    Wheel.aggregate([
      { $match: { tags: { $elemMatch: { $regex: /[A-Z]/ } } } },
      { $unwind: "$tags" },
      { $match: { tags: { $regex: /[A-Z]/ } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
    ]),
  ]);

  console.log(
    `[migrate] Stage 3 done: ${totalWheels} wheels total, ${wheelsWithUppercase} with uppercase tags, ${tagsBreakdown.length} distinct uppercase tag values (top 50)`
  );

  return {
    totalWheels,
    wheelsWithUppercase,
    sampleUppercaseTags: tagsBreakdown.map((t) => ({ tag: t._id, occurrences: t.count })),
  };
}

// ── Stage 4: backfill — lowercase + trim all wheel tags ─────────────────────
//
// Runs as a single aggregation-pipeline updateMany, which is atomic per doc
// and finishes in one round trip. No bulkWrite batching needed because the
// whole operation is server-side in Mongo.
//
// SAFE AGAINST LIVE CODE: the currently-deployed `/api/wheels-by-tag` and
// `/api/suggested-wheels` still use case-insensitive regex, so lowercased
// data continues to match the old queries too.
async function backfillWheels() {
  const startedAt = new Date();

  const totalWheels = await Wheel.countDocuments({});
  // Count before
  const before = await Wheel.countDocuments({
    tags: { $elemMatch: { $regex: /[A-Z]/ } },
  });
  console.log(
    `[migrate] Stage 4 (backfill-wheels): starting; ${totalWheels} wheels total, ${before} with uppercase tags`
  );

  const result = await Wheel.updateMany({}, [
    {
      $set: {
        tags: {
          $map: {
            input: { $ifNull: ["$tags", []] },
            as: "t",
            in: {
              $trim: {
                input: { $toLower: { $ifNull: ["$$t", ""] } },
              },
            },
          },
        },
      },
    },
  ]);

  // Drop any empty strings that might have appeared after trim (idempotent).
  await Wheel.updateMany(
    { tags: "" },
    { $pull: { tags: "" } }
  );

  const after = await Wheel.countDocuments({
    tags: { $elemMatch: { $regex: /[A-Z]/ } },
  });

  const finishedAt = new Date();
  console.log(
    `[migrate] Stage 4 done: matched=${result.matchedCount}, modified=${result.modifiedCount}, uppercase ${before} → ${after} in ${finishedAt - startedAt}ms`
  );

  return {
    totalWheels,
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
    wheelsWithUppercaseBefore: before,
    wheelsWithUppercaseAfter: after,
    durationMs: finishedAt - startedAt,
  };
}

// ── Stage 5: verify ─────────────────────────────────────────────────────────
async function verify() {
  console.log("[migrate] Stage 5 (verify): running final checks…");

  const [uppercaseWheels, duplicateGroups, totalWheels, totalTopicPages] = await Promise.all([
    Wheel.countDocuments({ tags: { $elemMatch: { $regex: /[A-Z]/ } } }),
    TopicPage.aggregate([
      { $group: { _id: { type: "$type", relatedId: "$relatedId" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: "n" },
    ]),
    Wheel.countDocuments({}),
    TopicPage.countDocuments({}),
  ]);

  const dupes = duplicateGroups[0]?.n || 0;
  const ready = uppercaseWheels === 0 && dupes === 0;
  console.log(
    `[migrate] Stage 5 done: scanned ${totalWheels} wheels + ${totalTopicPages} topicpages → uppercase=${uppercaseWheels}, dupeGroups=${dupes}, ready=${ready}`
  );

  return {
    totalWheelsScanned: totalWheels,
    totalTopicPagesScanned: totalTopicPages,
    uppercaseWheelsRemaining: uppercaseWheels,
    topicPageDuplicateGroupsRemaining: dupes,
    ready,
  };
}

export async function POST(req) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongoDB();

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body?.action;
  try {
    switch (action) {
      case "check-duplicates":
        return NextResponse.json(await checkDuplicates());
      case "dedupe-topicpages":
        return NextResponse.json(await dedupeTopicPages());
      case "dry-run-wheels":
        return NextResponse.json(await dryRunWheels());
      case "backfill-wheels":
        return NextResponse.json(await backfillWheels());
      case "verify":
        return NextResponse.json(await verify());
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("migrate-lowercase-tags error:", err);
    return NextResponse.json(
      { error: err.message || "Internal error" },
      { status: 500 }
    );
  }
}
