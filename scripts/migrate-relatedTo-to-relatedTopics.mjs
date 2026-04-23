/**
 * One-shot migration: Wheel.relatedTo (single object)  ->  Wheel.relatedTopics (array).
 *
 * Context: a wheel can legitimately be "about" multiple entities (e.g. a
 * "GTA or Need for Speed Picker" references two games). The previous
 * `relatedTo: {type, id}` schema forced a single parent and lost that
 * flexibility. We now store an array of `{type, id}` entries and drop
 * the old field.
 *
 * For each wheel doc:
 *   - if `relatedTo.type` and `relatedTo.id` are both present,
 *     push `{type, id}` into the new `relatedTopics` array.
 *   - otherwise leave `relatedTopics` empty.
 *   - always $unset `relatedTo`.
 *
 * Usage:
 *   node scripts/migrate-relatedTo-to-relatedTopics.mjs --dry-run
 *   node scripts/migrate-relatedTo-to-relatedTopics.mjs
 *
 * Safe to re-run — docs that already have `relatedTopics` populated and
 * no legacy `relatedTo` are skipped.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const col = db.collection("wheels");

  const filter = { relatedTo: { $exists: true } };
  const total = await col.countDocuments(filter);
  console.log(`Wheels with legacy relatedTo field: ${total}`);

  const cursor = col.find(filter, {
    projection: { _id: 1, relatedTo: 1, relatedTopics: 1 },
  });

  let scanned = 0;
  let copied = 0;
  let emptyUnset = 0;
  let alreadyHad = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    const legacy = doc.relatedTo;
    const hasValidLegacy =
      legacy &&
      typeof legacy === "object" &&
      typeof legacy.type === "string" &&
      typeof legacy.id === "string" &&
      legacy.id.length > 0;

    // If relatedTopics already contains this entry, don't double-insert.
    const existing = Array.isArray(doc.relatedTopics) ? doc.relatedTopics : [];
    const alreadyPresent =
      hasValidLegacy &&
      existing.some(
        (t) => t && t.type === legacy.type && t.id === legacy.id
      );

    if (DRY_RUN) {
      if (hasValidLegacy && !alreadyPresent) copied++;
      else if (!hasValidLegacy) emptyUnset++;
      else alreadyHad++;
      continue;
    }

    const update = { $unset: { relatedTo: "" } };
    if (hasValidLegacy && !alreadyPresent) {
      update.$push = {
        relatedTopics: { type: legacy.type, id: legacy.id },
      };
      copied++;
    } else if (!hasValidLegacy) {
      emptyUnset++;
    } else {
      alreadyHad++;
    }

    await col.updateOne({ _id: doc._id }, update);
  }

  console.log("\n--- Migration summary ---");
  console.log(`Docs scanned:              ${scanned}`);
  console.log(`Copied into relatedTopics: ${copied}`);
  console.log(`Legacy was empty/invalid:  ${emptyUnset}`);
  console.log(`Already had the entry:     ${alreadyHad}`);
  console.log(`Mode:                      ${DRY_RUN ? "DRY-RUN" : "WRITE"}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
