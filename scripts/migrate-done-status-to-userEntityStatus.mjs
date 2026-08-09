/**
 * One-shot migration: copy existing UnifiedList entity items with status "done"
 * into the new UserEntityStatus collection.
 *
 * Why: we split "list membership" from "progress/status". Existing users who
 * marked items as done via quick-track should keep that state in the new
 * UserEntityStatus collection so the "Mark as Watched/Played/Favourite" toggle
 * and "DoneNudge" continue to work.
 *
 * Run:
 *   node scripts/migrate-done-status-to-userEntityStatus.mjs --dry-run
 *   node scripts/migrate-done-status-to-userEntityStatus.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectMongoDB } from "../lib/mongodb.js";
import UnifiedList from "../models/unifiedlist.js";
import UserEntityStatus from "../models/userEntityStatus.js";

dotenv.config();

const dryRun = process.argv.includes("--dry-run");

async function main() {
  await connectMongoDB();

  const cursor = UnifiedList.find({
    isDeleted: { $ne: true },
    "items.type": "entity",
    "items.status": { $in: ["done", "in-progress"] },
  })
    .select("userId items")
    .cursor();

  let migrated = 0;
  let skipped = 0;

  for await (const list of cursor) {
    const userId = list.userId;
    const doneItems = (list.items || []).filter(
      (item) =>
        item.type === "entity" &&
        ["done", "in-progress"].includes(item.status) &&
        item.entityId != null &&
        item.entityType
    );

    for (const item of doneItems) {
      const entityId = String(item.entityId);
      const entityType = item.entityType;
      const name = item.name || "Untitled";

      const existing = await UserEntityStatus.findOne({ userId, entityId }).lean();
      if (existing) {
        skipped++;
        continue;
      }

      if (!dryRun) {
        await UserEntityStatus.create({
          userId,
          entityType,
          entityId,
          name,
          status: "done",
          createdAt: item.addedAt || new Date(),
          updatedAt: item.addedAt || new Date(),
        });
      }
      migrated++;
    }
  }

  console.log(
    dryRun
      ? `[DRY-RUN] Would migrate ${migrated} items, skip ${skipped} existing.`
      : `Migrated ${migrated} items, skipped ${skipped} existing.`
  );

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
