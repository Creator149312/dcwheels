/**
 * Admin API for the one-shot "relatedTo (single) → relatedTopics (array)" migration.
 *
 * Stages — each is a separate POST action so the admin UI can run them
 * one-by-one with explicit confirmation:
 *
 *   action=count    Scan wheels and report how many still have legacy
 *                   `relatedTo`, how many would be copied vs already
 *                   present in `relatedTopics`, and how many have an
 *                   empty/invalid legacy value (just $unset). No writes.
 *
 *   action=migrate  Same logic as scripts/migrate-relatedTo-to-relatedTopics.mjs:
 *                   for each doc with legacy relatedTo, $push the entry into
 *                   relatedTopics (skip if already present) and $unset
 *                   relatedTo. Idempotent.
 *
 *   action=verify   Post-migration sanity check: zero docs with `relatedTo`
 *                   left, count of docs whose `relatedTopics` is populated,
 *                   and a sample of any docs that look anomalous (entries
 *                   missing `type` or `id`).
 *
 * Access: gated on isAdminSession (role claim or legacy email fallback).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import { isAdminSession } from "@utils/auth/isAdmin";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return isAdminSession(session);
}

// ── Stage 1: count what would change ────────────────────────────────────────
async function countLegacy() {
  const col = Wheel.collection;

  const totalWheels = await col.countDocuments({});
  const withLegacy = await col.countDocuments({ relatedTo: { $exists: true } });
  console.log(
    `[migrate-related-topics] count: ${withLegacy}/${totalWheels} wheels have legacy relatedTo`
  );

  const cursor = col.find(
    { relatedTo: { $exists: true } },
    { projection: { _id: 1, relatedTo: 1, relatedTopics: 1 } }
  );

  let wouldCopy = 0;
  let alreadyPresent = 0;
  let emptyOrInvalid = 0;
  const samples = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const legacy = doc.relatedTo;
    const valid =
      legacy &&
      typeof legacy === "object" &&
      typeof legacy.type === "string" &&
      typeof legacy.id === "string" &&
      legacy.id.length > 0;

    const existing = Array.isArray(doc.relatedTopics) ? doc.relatedTopics : [];
    const dup =
      valid &&
      existing.some((t) => t && t.type === legacy.type && t.id === legacy.id);

    if (!valid) emptyOrInvalid++;
    else if (dup) alreadyPresent++;
    else wouldCopy++;

    if (samples.length < 10) {
      samples.push({
        id: String(doc._id),
        relatedTo: legacy,
        existingCount: existing.length,
        action: !valid ? "unset-only" : dup ? "skip-dup" : "copy",
      });
    }
  }

  return {
    totalWheels,
    withLegacy,
    wouldCopy,
    alreadyPresent,
    emptyOrInvalid,
    samples,
  };
}

// ── Stage 2: run the migration ──────────────────────────────────────────────
async function runMigration() {
  const startedAt = Date.now();
  const col = Wheel.collection;

  const filter = { relatedTo: { $exists: true } };
  const total = await col.countDocuments(filter);
  console.log(`[migrate-related-topics] migrate: ${total} docs to process`);

  const cursor = col.find(filter, {
    projection: { _id: 1, relatedTo: 1, relatedTopics: 1 },
  });

  let scanned = 0;
  let copied = 0;
  let emptyUnset = 0;
  let alreadyHad = 0;
  const failures = [];

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    const legacy = doc.relatedTo;
    const valid =
      legacy &&
      typeof legacy === "object" &&
      typeof legacy.type === "string" &&
      typeof legacy.id === "string" &&
      legacy.id.length > 0;

    const existing = Array.isArray(doc.relatedTopics) ? doc.relatedTopics : [];
    const dup =
      valid &&
      existing.some((t) => t && t.type === legacy.type && t.id === legacy.id);

    const update = { $unset: { relatedTo: "" } };
    if (valid && !dup) {
      update.$push = {
        relatedTopics: { type: legacy.type, id: legacy.id },
      };
    }

    try {
      await col.updateOne({ _id: doc._id }, update);
      if (valid && !dup) copied++;
      else if (!valid) emptyUnset++;
      else alreadyHad++;
    } catch (err) {
      failures.push({ id: String(doc._id), error: err.message });
      console.error(`[migrate-related-topics] failed ${doc._id}:`, err.message);
    }
  }

  const durationMs = Date.now() - startedAt;
  console.log(
    `[migrate-related-topics] migrate done in ${durationMs}ms — copied ${copied}, alreadyHad ${alreadyHad}, emptyUnset ${emptyUnset}, failures ${failures.length}`
  );

  return {
    scanned,
    copied,
    alreadyHad,
    emptyUnset,
    failures,
    durationMs,
  };
}

// ── Stage 3: verify ─────────────────────────────────────────────────────────
async function verify() {
  const col = Wheel.collection;

  const remainingLegacy = await col.countDocuments({
    relatedTo: { $exists: true },
  });
  const totalWheels = await col.countDocuments({});
  const withRelatedTopics = await col.countDocuments({
    relatedTopics: { $exists: true, $not: { $size: 0 } },
  });

  // Anomaly: array entries missing `type` or `id`.
  const anomalous = await col
    .find(
      {
        $or: [
          { "relatedTopics.type": { $exists: false } },
          { "relatedTopics.id": { $exists: false } },
          { "relatedTopics.type": "" },
          { "relatedTopics.id": "" },
        ],
      },
      { projection: { _id: 1, relatedTopics: 1 }, limit: 20 }
    )
    .toArray();

  const ready = remainingLegacy === 0 && anomalous.length === 0;

  console.log(
    `[migrate-related-topics] verify: remainingLegacy=${remainingLegacy}, withRelatedTopics=${withRelatedTopics}, anomalous=${anomalous.length}, ready=${ready}`
  );

  return {
    ready,
    totalWheels,
    remainingLegacy,
    withRelatedTopics,
    anomalousCount: anomalous.length,
    anomalousSamples: anomalous.map((d) => ({
      id: String(d._id),
      relatedTopics: d.relatedTopics,
    })),
  };
}

export async function POST(req) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await req.json();
  await connectMongoDB();

  try {
    switch (action) {
      case "count":
        return NextResponse.json(await countLegacy());
      case "migrate":
        return NextResponse.json(await runMigration());
      case "verify":
        return NextResponse.json(await verify());
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error(`[migrate-related-topics] action=${action} failed:`, err);
    return NextResponse.json(
      { error: err.message || "Migration step failed" },
      { status: 500 }
    );
  }
}

// Keep dynamic — admin-only, no caching.
export const dynamic = "force-dynamic";
