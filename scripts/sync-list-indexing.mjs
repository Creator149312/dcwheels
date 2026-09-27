#!/usr/bin/env node
/**
 * scripts/sync-list-indexing.mjs
 *
 * One-time and maintenance script to evaluate all public lists in the database
 * against the Auto-Index Quality Gate (lib/listIndexGate.js) and update the
 * `indexed` flag accordingly.
 *
 * Usage:
 *   node scripts/sync-list-indexing.mjs [--dry-run]
 */

import dotenv from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { evaluateListQuality } from "../lib/listIndexGate.js";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const isDryRun = process.argv.includes("--dry-run");

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected.\n");

  const collection = mongoose.connection.db.collection("unifiedlists");

  const lists = await collection.find({}).toArray();
  console.log(`Total lists in collection: ${lists.length}`);

  let promotedCount = 0;
  let demotedCount = 0;
  let unchangedCount = 0;

  for (const list of lists) {
    const shouldIndex = evaluateListQuality(list);
    const currentlyIndexed = list.indexed === true;

    if (shouldIndex && !currentlyIndexed) {
      promotedCount++;
      console.log(`[PROMOTED -> indexed: true] "${list.name}" (items: ${list.items?.length || 0}, likes: ${list.likeCount || 0}, comments: ${list.commentCount || 0})`);
      if (!isDryRun) {
        await collection.updateOne({ _id: list._id }, { $set: { indexed: true } });
      }
    } else if (!shouldIndex && currentlyIndexed) {
      demotedCount++;
      console.log(`[DEMOTED -> indexed: false] "${list.name}"`);
      if (!isDryRun) {
        await collection.updateOne({ _id: list._id }, { $set: { indexed: false } });
      }
    } else {
      unchangedCount++;
    }
  }

  console.log("\n================ SUMMARY ================");
  console.log(`Mode:      ${isDryRun ? "DRY RUN (no database writes)" : "APPLIED"}`);
  console.log(`Promoted:  ${promotedCount} lists -> indexed: true`);
  console.log(`Demoted:   ${demotedCount} lists -> indexed: false`);
  console.log(`Unchanged: ${unchangedCount} lists`);
  console.log("=========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
