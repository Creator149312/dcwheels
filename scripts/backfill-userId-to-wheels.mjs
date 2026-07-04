import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";

// Load environment variables
dotenv.config({ path: ".env" });

/**
 * Backfill script: Populate userId for all existing wheels
 *
 * Usage: node scripts/backfill-userId-to-wheels.mjs
 *
 * Strategy:
 *   1. Find all wheels WITHOUT userId
 *   2. For each wheel, look up the User by createdBy (email or username)
 *   3. Update the wheel with the found userId
 *   4. Skip wheels that can't be matched (log them)
 */

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI not set in .env");
  process.exit(1);
}

(async () => {
  let client;
  try {
    // Connect using native MongoDB driver
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db();
    const wheelsCollection = db.collection("wheels");
    const usersCollection = db.collection("users");

    // Find wheels without userId
    const wheelsWithoutUserId = await wheelsCollection
      .find({ userId: { $exists: false } })
      .project({ createdBy: 1, authorHandle: 1, _id: 1 })
      .toArray();

    console.log(`\n📊 Found ${wheelsWithoutUserId.length} wheels to backfill\n`);

    if (wheelsWithoutUserId.length === 0) {
      console.log("✨ All wheels already have userId! Nothing to do.");
      await client.close();
      process.exit(0);
    }

    let successCount = 0;
    let skipCount = 0;
    const failures = [];

    for (const wheel of wheelsWithoutUserId) {
      try {
        // Strategy: Try multiple lookups
        // 1. By email (createdBy is often email)
        let user = await usersCollection.findOne({ email: wheel.createdBy });

        // 2. By username (authorHandle)
        if (!user && wheel.authorHandle) {
          user = await usersCollection.findOne({ username: wheel.authorHandle });
        }

        // 3. By name pattern (case-insensitive)
        if (!user && wheel.createdBy) {
          user = await usersCollection.findOne({
            name: { $regex: new RegExp(`^${wheel.createdBy}$`, "i") }
          });
        }

        if (user) {
          await wheelsCollection.updateOne(
            { _id: wheel._id },
            { $set: { userId: user._id } }
          );
          successCount++;
        } else {
          skipCount++;
          failures.push({
            wheelId: wheel._id.toString(),
            createdBy: wheel.createdBy,
            authorHandle: wheel.authorHandle,
            reason: "User not found"
          });
        }
      } catch (err) {
        skipCount++;
        failures.push({
          wheelId: wheel._id.toString(),
          createdBy: wheel.createdBy,
          error: err.message
        });
      }

      // Log progress every 100 wheels
      if ((successCount + skipCount) % 100 === 0) {
        console.log(`⏳ Progress: ${successCount} updated, ${skipCount} skipped`);
      }
    }

    console.log(`\n✅ Backfill complete!`);
    console.log(`   📈 Updated: ${successCount} wheels`);
    console.log(`   ⏭️  Skipped: ${skipCount} wheels`);

    if (failures.length > 0) {
      console.log(`\n⚠️  ${failures.length} failures:`);
      failures.slice(0, 10).forEach((f) => {
        console.log(`   - ${f.wheelId}: ${f.reason || f.error}`);
      });
      if (failures.length > 10) {
        console.log(`   ... and ${failures.length - 10} more`);
      }
    }

    await client.close();
    console.log("\n✨ Done!");
  } catch (err) {
    console.error("❌ Backfill failed:", err.message);
    if (client) await client.close();
    process.exit(1);
  }
})();
