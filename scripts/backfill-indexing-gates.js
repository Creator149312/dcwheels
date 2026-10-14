/**
 * scripts/backfill-indexing-gates.js
 *
 * Safe backfill migration script for Wheel and UnifiedList index states.
 * 
 * Usage:
 *   node scripts/backfill-indexing-gates.js --dry-run
 *   node scripts/backfill-indexing-gates.js --apply
 *
 * Mode: Option A (Zero Exemptions / Pure Gate)
 * 1. Evaluates EVERY wheel and list through its respective quality gate.
 * 2. Does NOT grant arbitrary exemptions to thin official wheels.
 * 3. Supports dry-run mode to inspect exact counts before writing to MongoDB.
 */

const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");
const { evaluateWheelQuality } = require("../lib/wheelIndexGate.js");
const { evaluateListQuality } = require("../lib/listIndexGate.js");

const isDryRun = !process.argv.includes("--apply");

async function run() {
  console.log(`\n======================================================`);
  console.log(`  INDEXING GATES BACKFILL (${isDryRun ? "DRY-RUN MODE" : "LIVE APPLY MODE"})`);
  console.log(`  Mode: Option A (Pure Gate - No Exemptions for Thin Content)`);
  console.log(`======================================================\n`);

  if (!process.env.MONGODB_URI) {
    console.error("Error: MONGODB_URI not found in environment.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.\n");

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Wheel Audit & Sync (Pure Gate across all wheels)
  // ─────────────────────────────────────────────────────────────────────────
  const allWheels = await mongoose.connection
    .collection("wheels")
    .find({})
    .project({
      _id: 1,
      title: 1,
      slug: 1,
      description: 1,
      data: 1,
      likeCount: 1,
      commentCount: 1,
      isPublic: 1,
      isDeleted: 1,
      indexed: 1,
    })
    .toArray();

  let wheelsPromoted = 0;
  let wheelsDemoted = 0;
  let wheelsUnchanged = 0;

  const wheelBulkOps = [];

  for (const wheel of allWheels) {
    const shouldIndex = evaluateWheelQuality(wheel);
    const currentIndexed = !!wheel.indexed;

    if (!currentIndexed && shouldIndex) {
      wheelsPromoted++;
      if (!isDryRun) {
        wheelBulkOps.push({
          updateOne: {
            filter: { _id: wheel._id },
            update: { $set: { indexed: true } },
          },
        });
      }
    } else if (currentIndexed && !shouldIndex) {
      wheelsDemoted++;
      if (!isDryRun) {
        wheelBulkOps.push({
          updateOne: {
            filter: { _id: wheel._id },
            update: { $set: { indexed: false } },
          },
        });
      }
    } else {
      wheelsUnchanged++;
    }
  }

  console.log(`\n--- WHEELS BREAKDOWN ---`);
  console.log(`Total wheels in database: ${allWheels.length}`);
  console.log(`Wheels promoted (indexed: false -> true): ${wheelsPromoted}`);
  console.log(`Wheels demoted (indexed: true -> false): ${wheelsDemoted}`);
  console.log(`Wheels unchanged: ${wheelsUnchanged}`);
  console.log(`Total wheels that WILL BE indexed: ${allWheels.filter(w => evaluateWheelQuality(w)).length}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. List Audit & Sync
  // ─────────────────────────────────────────────────────────────────────────
  const allLists = await mongoose.connection
    .collection("unifiedlists")
    .find({})
    .project({
      _id: 1,
      name: 1,
      description: 1,
      items: 1,
      likeCount: 1,
      commentCount: 1,
      isPublic: 1,
      isDeleted: 1,
      isSystem: 1,
      forkedFrom: 1,
      indexed: 1,
    })
    .toArray();

  let listsPromoted = 0;
  let listsDemoted = 0;
  let listsUnchanged = 0;

  const listBulkOps = [];

  for (const list of allLists) {
    const shouldIndex = evaluateListQuality(list);
    const currentIndexed = !!list.indexed;

    if (!currentIndexed && shouldIndex) {
      listsPromoted++;
      if (!isDryRun) {
        listBulkOps.push({
          updateOne: {
            filter: { _id: list._id },
            update: { $set: { indexed: true } },
          },
        });
      }
    } else if (currentIndexed && !shouldIndex) {
      listsDemoted++;
      if (!isDryRun) {
        listBulkOps.push({
          updateOne: {
            filter: { _id: list._id },
            update: { $set: { indexed: false } },
          },
        });
      }
    } else {
      listsUnchanged++;
    }
  }

  console.log(`\n--- LISTS BREAKDOWN ---`);
  console.log(`Total lists in database: ${allLists.length}`);
  console.log(`Lists promoted (indexed: false -> true): ${listsPromoted}`);
  console.log(`Lists demoted (indexed: true -> false): ${listsDemoted}`);
  console.log(`Lists unchanged: ${listsUnchanged}`);

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Execution
  // ─────────────────────────────────────────────────────────────────────────
  if (isDryRun) {
    console.log(`\n[DRY RUN COMPLETE] No changes were written to the database.`);
    console.log(`To apply these changes, re-run with: node scripts/backfill-indexing-gates.js --apply\n`);
  } else {
    console.log(`\nWriting updates to MongoDB...`);
    if (wheelBulkOps.length > 0) {
      const resW = await mongoose.connection.collection("wheels").bulkWrite(wheelBulkOps);
      console.log(`Updated ${resW.modifiedCount} wheel documents.`);
    }
    if (listBulkOps.length > 0) {
      const resL = await mongoose.connection.collection("unifiedlists").bulkWrite(listBulkOps);
      console.log(`Updated ${resL.modifiedCount} list documents.`);
    }
    console.log(`\n[APPLY COMPLETE] Database indexing states successfully synchronized.\n`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
