/**
 * One-time backfill script to populate viewCount and likeCount
 * on existing Wheel documents from Visit and ReactionTest collections.
 *
 * Run with: node scripts/backfill-wheel-counters.mjs
 *
 * Safe to re-run — it overwrites counters with accurate aggregated values.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

async function backfill() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const wheelsCol = db.collection("wheels");
  const visitsCol = db.collection("visits");
  const reactionsCol = db.collection("reactiontests");

  // 1) Aggregate view counts from visits
  console.log("Aggregating view counts...");
  const viewCounts = await visitsCol
    .aggregate([
      { $group: { _id: "$wheelId", count: { $sum: 1 } } },
    ])
    .toArray();

  console.log(`Found view data for ${viewCounts.length} wheels`);

  let viewUpdated = 0;
  for (const { _id, count } of viewCounts) {
    if (!_id) continue;
    const result = await wheelsCol.updateOne(
      { _id },
      { $set: { viewCount: count } }
    );
    if (result.modifiedCount > 0) viewUpdated++;
  }
  console.log(`Updated viewCount on ${viewUpdated} wheels`);

  // 2) Aggregate like counts from reactions (entityType=wheel, reactionType=like)
  console.log("Aggregating like counts...");
  const likeCounts = await reactionsCol
    .aggregate([
      { $match: { entityType: "wheel", reactionType: "like" } },
      { $group: { _id: "$entityId", count: { $sum: 1 } } },
    ])
    .toArray();

  console.log(`Found like data for ${likeCounts.length} wheels`);

  let likeUpdated = 0;
  for (const { _id, count } of likeCounts) {
    if (!_id) continue;
    const result = await wheelsCol.updateOne(
      { _id },
      { $set: { likeCount: count } }
    );
    if (result.modifiedCount > 0) likeUpdated++;
  }
  console.log(`Updated likeCount on ${likeUpdated} wheels`);

  // 3) Ensure wheels with no visits/likes have 0 (default handles new, but existing docs may lack the field)
  console.log("Setting defaults for wheels without counters...");
  const defaultResult = await wheelsCol.updateMany(
    { $or: [{ viewCount: { $exists: false } }, { likeCount: { $exists: false } }] },
    { $set: { viewCount: 0, likeCount: 0 } }
  );
  console.log(`Set defaults on ${defaultResult.modifiedCount} wheels`);

  console.log("Backfill complete!");
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
