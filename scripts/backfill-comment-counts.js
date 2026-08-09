/**
 * One-time backfill script for denormalized commentCount and likeCount on
 * Wheel and UnifiedList.
 *
 * Before running this, the commentCount and likeCount fields must exist in the
 * schemas. The script counts top-level comments and likes per wheel/list and
 * writes the results.
 *
 * Usage:
 *   node scripts/backfill-comment-counts.js
 *
 * Safe to run multiple times — it overwrites counts with the current values.
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const Comment = mongoose.connection.collection("comments");
  const Reaction = mongoose.connection.collection("reactions");
  const Wheel = mongoose.connection.collection("wheels");
  const UnifiedList = mongoose.connection.collection("unifiedlists");

  // Backfill wheels (entityType "wheel" and "uwheel" both point to the Wheel collection)
  const wheelCursor = Wheel.find({}, { projection: { _id: 1 } });
  let wheelUpdated = 0;

  for await (const wheel of wheelCursor) {
    const [commentCount, likeCount] = await Promise.all([
      Comment.countDocuments({
        entityType: { $in: ["wheel", "uwheel"] },
        entityId: wheel._id,
        parentCommentId: null,
      }),
      Reaction.countDocuments({
        entityType: { $in: ["wheel", "uwheel"] },
        entityId: wheel._id,
        reactionType: "like",
      }),
    ]);

    await Wheel.updateOne(
      { _id: wheel._id },
      { $set: { commentCount, likeCount } }
    );
    wheelUpdated += 1;

    if (wheelUpdated % 100 === 0) {
      console.log(`Updated ${wheelUpdated} wheels...`);
    }
  }
  console.log(`Wheels backfilled: ${wheelUpdated}`);

  // Backfill lists
  const listCursor = UnifiedList.find({}, { projection: { _id: 1 } });
  let listUpdated = 0;

  for await (const list of listCursor) {
    const [commentCount, likeCount] = await Promise.all([
      Comment.countDocuments({
        entityType: "list",
        entityId: list._id,
        parentCommentId: null,
      }),
      Reaction.countDocuments({
        entityType: "list",
        entityId: list._id,
        reactionType: "like",
      }),
    ]);

    await UnifiedList.updateOne(
      { _id: list._id },
      { $set: { commentCount, likeCount } }
    );
    listUpdated += 1;

    if (listUpdated % 100 === 0) {
      console.log(`Updated ${listUpdated} lists...`);
    }
  }
  console.log(`Lists backfilled: ${listUpdated}`);

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
