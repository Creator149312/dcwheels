/**
 * One-shot migration: normalize topic/tag reference IDs across the DB.
 *
 * Run with:
 *   node scripts/normalize-feed-ids.mjs
 *
 * Fixes:
 * - Post.contentRef.externalId → String
 * - Wheel.relatedTopics[].id   → String
 * - Wheel.tags / Post.tags     → lowercase, hyphenated, no special chars
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

function normalizeTag(t) {
  return String(t)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;

  // 1. Normalize Post.contentRef.externalId to strings
  const postsResult = await db.collection("posts").updateMany(
    {
      "contentRef.externalId": { $exists: true, $type: "number" },
    },
    [
      {
        $set: {
          "contentRef.externalId": { $toString: "$contentRef.externalId" },
        },
      },
    ]
  );
  console.log(`Posts normalized: ${postsResult.modifiedCount}`);

  // 2. Normalize Wheel.relatedTopics[].id to strings
  const wheelsWithNumericTopics = await db
    .collection("wheels")
    .find({ "relatedTopics.id": { $type: "number" } })
    .toArray();

  let wheelsTopicCount = 0;
  for (const wheel of wheelsWithNumericTopics) {
    const relatedTopics = (wheel.relatedTopics || []).map((topic) => ({
      ...topic,
      id: String(topic.id),
    }));
    await db.collection("wheels").updateOne(
      { _id: wheel._id },
      { $set: { relatedTopics } }
    );
    wheelsTopicCount++;
  }
  console.log(`Wheels relatedTopics normalized: ${wheelsTopicCount}`);

  // 3. Normalize Wheel.tags
  const wheelsWithTags = await db
    .collection("wheels")
    .find({ tags: { $exists: true, $ne: [] } })
    .toArray();

  let wheelsTagCount = 0;
  for (const wheel of wheelsWithTags) {
    const normalized = [...new Set((wheel.tags || []).map(normalizeTag).filter(Boolean))];
    if (JSON.stringify(normalized) !== JSON.stringify(wheel.tags || [])) {
      await db.collection("wheels").updateOne(
        { _id: wheel._id },
        { $set: { tags: normalized } }
      );
      wheelsTagCount++;
    }
  }
  console.log(`Wheels tags normalized: ${wheelsTagCount}`);

  // 4. Normalize Post.tags
  const postsWithTags = await db
    .collection("posts")
    .find({ tags: { $exists: true, $ne: [] } })
    .toArray();

  let postsTagCount = 0;
  for (const post of postsWithTags) {
    const normalized = [...new Set((post.tags || []).map(normalizeTag).filter(Boolean))];
    if (JSON.stringify(normalized) !== JSON.stringify(post.tags || [])) {
      await db.collection("posts").updateOne(
        { _id: post._id },
        { $set: { tags: normalized } }
      );
      postsTagCount++;
    }
  }
  console.log(`Posts tags normalized: ${postsTagCount}`);

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
