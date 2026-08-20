#!/usr/bin/env node
/**
 * Deletes UnifiedList documents that were migrated from the high-quality
 * TMDB lists JSON file.
 *
 * This is useful before re-migrating after updating descriptions or items.
 *
 * Usage:
 *   node scripts/delete-migrated-unifiedlists.js [--dry-run]
 */

import dotenv from "dotenv";
import { resolve } from "node:path";
import mongoose from "mongoose";
import { connectMongoDB } from "../lib/mongodb.js";
import UnifiedList from "../models/unifiedlist.js";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const OWNER_IDS = [
  "6a4916864e84a6766406ad85",
  "6a4916b84e84a6766406ada0",
  "6a4916934e84a6766406ad8e",
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  for (const id of OWNER_IDS) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`Invalid owner ObjectId: ${id}`);
      process.exit(1);
    }
  }

  await connectMongoDB();

  const filter = {
    userId: { $in: OWNER_IDS },
  };

  const count = await UnifiedList.countDocuments(filter);

  console.log(`Found ${count} UnifiedList documents owned by the target users.`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}\n`);

  if (count === 0) {
    console.log("Nothing to delete.");
    await mongoose.disconnect();
    process.exit(0);
  }

  if (dryRun) {
    const lists = await UnifiedList.find(filter)
      .select("name userId createdAt")
      .sort({ createdAt: -1 })
      .lean();

    for (const list of lists) {
      console.log(`  would delete: ${list.name} (${list.userId})`);
    }
  } else {
    // Hard delete because the { userId: 1, name: 1 } unique index prevents
    // re-creating lists with the same name after a soft delete.
    const result = await UnifiedList.deleteMany(filter);

    console.log(`Hard-deleted ${result.deletedCount} lists.`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Delete operation failed:", err);
  process.exit(1);
});
