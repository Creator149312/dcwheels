/**
 * Inspect the two email-collision users to help decide on merge/delete.
 * Uses direct collection access so it doesn't need to import ES-module models.
 */

require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

async function inspect(db, emailMixed, collisionId) {
  const users = db.collection("users");
  const mixedUser = await users.findOne({ email: new RegExp(`^${emailMixed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
  const lowerUser = await users.findOne({ _id: new ObjectId(collisionId) });

  console.log(`\n=== ${emailMixed} ===`);
  console.log("Mixed-case user:", {
    _id: mixedUser?._id?.toString(),
    email: mixedUser?.email,
    username: mixedUser?.username,
    name: mixedUser?.name,
    authMethod: mixedUser?.authMethod,
    createdAt: mixedUser?.createdAt,
    updatedAt: mixedUser?.updatedAt,
  });
  console.log("Lowercase user:", {
    _id: lowerUser?._id?.toString(),
    email: lowerUser?.email,
    username: lowerUser?.username,
    name: lowerUser?.name,
    authMethod: lowerUser?.authMethod,
    createdAt: lowerUser?.createdAt,
    updatedAt: lowerUser?.updatedAt,
  });

  const userIds = [mixedUser?._id, lowerUser?._id].filter(Boolean).map((id) => new ObjectId(id.toString()));
  const emails = [mixedUser?.email, lowerUser?.email].filter(Boolean);

  const [wheelsByUserId, wheelsByEmail, listCount, postCount, commentCount, decisionCount] = await Promise.all([
    db.collection("wheels").countDocuments({ userId: { $in: userIds } }),
    db.collection("wheels").countDocuments({ createdBy: { $in: emails } }),
    db.collection("unifiedlists").countDocuments({ userId: { $in: userIds } }),
    db.collection("posts").countDocuments({ userId: { $in: userIds } }),
    db.collection("comments").countDocuments({ userId: { $in: userIds } }),
    db.collection("decisionlogs").countDocuments({ userId: { $in: userIds } }),
  ]);

  console.log("Activity summary:");
  console.log(`  wheels by userId: ${wheelsByUserId}`);
  console.log(`  wheels by createdBy email: ${wheelsByEmail}`);
  console.log(`  unified lists: ${listCount}`);
  console.log(`  posts: ${postCount}`);
  console.log(`  comments: ${commentCount}`);
  console.log(`  decision logs: ${decisionCount}`);
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

  await inspect(db, "Jacksonha2015@gmail.com", "68cc071412c5ad78536c7123");
  await inspect(db, "Madiehamilton12@gmail.com", "68e3f365ed7a8c53a3dcc342");

  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
