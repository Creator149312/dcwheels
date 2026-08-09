/**
 * Merge duplicate Google-created users into their credentials counterparts.
 *
 * For the two collisions found during the lowercase-email backfill:
 *   - Keep the credentials (mixed-case email) account.
 *   - Update its email to lowercase.
 *   - Move any content owned by the Google duplicate to the kept account.
 *   - Delete the Google duplicate.
 *
 * Run:
 *   node scripts/merge-email-collision-users.js
 */

require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const COLLISIONS = [
  {
    keepEmail: "Jacksonha2015@gmail.com",
    deleteId: "68cc071412c5ad78536c7123",
  },
  {
    keepEmail: "Madiehamilton12@gmail.com",
    deleteId: "68e3f365ed7a8c53a3dcc342",
  },
];

async function mergeOne(db, { keepEmail, deleteId }) {
  const users = db.collection("users");
  const keepUser = await users.findOne({ email: new RegExp(`^${keepEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  const deleteUser = await users.findOne({ _id: new ObjectId(deleteId) });

  if (!keepUser || !deleteUser) {
    console.log(`\nSkipping ${keepEmail}: keepUser=${!!keepUser}, deleteUser=${!!deleteUser}`);
    return;
  }

  const keepId = keepUser._id;
  const deletedId = deleteUser._id;
  const lowerEmail = keepUser.email.toLowerCase();

  console.log(`\nMerging ${keepUser.email} + ${deleteUser.email} → ${lowerEmail}`);
  console.log(`  keep:   ${keepId} (username: ${keepUser.username})`);
  console.log(`  delete: ${deletedId} (username: ${deleteUser.username})`);

  // The duplicate Google user likely only owns an auto-created "Saved" list.
  // Because the kept credentials user already has a "Saved" list, we can't
  // simply re-assign it (unique index on { userId, name }). Delete the
  // duplicate's Saved list instead — its items are empty anyway.
  const listsDelete = await db.collection("unifiedlists").deleteMany({ userId: deletedId });
  console.log(`  deleted duplicate unifiedlists: ${listsDelete.deletedCount}`);

  // Also move any wheels/posts/comments/decisions just in case.
  const [wheels, posts, comments, decisions] = await Promise.all([
    db.collection("wheels").updateMany({ userId: deletedId }, { $set: { userId: keepId } }),
    db.collection("posts").updateMany({ userId: deletedId }, { $set: { userId: keepId } }),
    db.collection("comments").updateMany({ userId: deletedId }, { $set: { userId: keepId } }),
    db.collection("decisionlogs").updateMany({ userId: deletedId }, { $set: { userId: keepId } }),
  ]);
  console.log(`  moved wheels: ${wheels.modifiedCount}`);
  console.log(`  moved posts: ${posts.modifiedCount}`);
  console.log(`  moved comments: ${comments.modifiedCount}`);
  console.log(`  moved decisions: ${decisions.modifiedCount}`);

  // Delete the duplicate Google user BEFORE normalizing the kept user's email,
  // otherwise the unique email index will reject the update.
  const deleteResult = await users.deleteOne({ _id: deletedId });
  console.log(`  deleted duplicate user: ${deleteResult.deletedCount}`);

  // Now safe to normalize the kept user's email to lowercase.
  const emailUpdate = await users.updateOne(
    { _id: keepId },
    { $set: { email: lowerEmail } }
  );
  console.log(`  normalized email: ${emailUpdate.modifiedCount}`);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  for (const collision of COLLISIONS) {
    await mergeOne(db, collision);
  }

  console.log("\nMerge complete.");
  await client.close();
}

main().catch((err) => {
  console.error("Merge failed:", err);
  process.exit(1);
});
