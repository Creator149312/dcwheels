/**
 * scripts/backfill-hotscore.mjs
 *
 * Backfills the logarithmic epoch `hotScore` across all existing Post, Wheel,
 * and UnifiedList documents in MongoDB.
 *
 * Usage:
 *   node scripts/backfill-hotscore.mjs
 */

import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in environment.");
  process.exit(1);
}

const EPOCH_BOOST_SECONDS = 43200; // 12h per 10x engagement

function computeHotScore({ createdAt, votes = 0, likes = 0, comments = 0 }) {
  const dateMs =
    createdAt instanceof Date
      ? createdAt.getTime()
      : new Date(createdAt || Date.now()).getTime();
  const createdSec = Math.floor((Number.isNaN(dateMs) ? Date.now() : dateMs) / 1000);

  const points =
    Math.max(0, Number(votes) || 0) * 1 +
    Math.max(0, Number(likes) || 0) * 2 +
    Math.max(0, Number(comments) || 0) * 4;

  const boostSec =
    points > 0 ? Math.round(Math.log10(points + 1) * EPOCH_BOOST_SECONDS) : 0;

  return createdSec + boostSec;
}

async function backfillCollection(db, collectionName, isPost = false) {
  const col = db.collection(collectionName);
  const cursor = col.find(
    {},
    {
      projection: {
        _id: 1,
        createdAt: 1,
        likeCount: 1,
        commentCount: 1,
        ...(isPost ? { pollOptions: 1 } : {}),
      },
    }
  );

  let ops = [];
  let totalUpdated = 0;

  for await (const doc of cursor) {
    const votes = isPost && Array.isArray(doc.pollOptions)
      ? doc.pollOptions.reduce((sum, o) => sum + (Number(o?.voteCount) || 0), 0)
      : 0;

    const hotScore = computeHotScore({
      createdAt: doc.createdAt || doc._id.getTimestamp(),
      votes,
      likes: doc.likeCount || 0,
      comments: doc.commentCount || 0,
    });

    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { hotScore } },
      },
    });

    if (ops.length >= 500) {
      await col.bulkWrite(ops, { ordered: false });
      totalUpdated += ops.length;
      ops = [];
    }
  }

  if (ops.length > 0) {
    await col.bulkWrite(ops, { ordered: false });
    totalUpdated += ops.length;
  }

  console.log(`✅ Backfilled ${totalUpdated} documents in '${collectionName}'`);
}

async function run() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  await backfillCollection(db, "posts", true);
  await backfillCollection(db, "wheels", false);
  await backfillCollection(db, "unifiedlists", false);

  await mongoose.disconnect();
  console.log("🎉 HotScore backfill complete!");
}

run().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
