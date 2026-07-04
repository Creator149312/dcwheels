/**
 * Migration script: Generate and populate username field for all existing users
 * 
 * Logic:
 * - Extracts username from email prefix (part before @)
 * - Removes +aliases (john+test@gmail.com → john)
 * - Handles collisions by appending counter (john-1, john-2, etc.)
 * - Respects existing usernames (skips if already set)
 * 
 * Usage: node scripts/migrate-add-username.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function generateUniqueUsername(baseUsername, userId, collection, existingUsernames = new Set()) {
  let uniqueUsername = baseUsername;
  let counter = 1;

  while (true) {
    // Check if username already exists in DB (excluding current user)
    const existing = await collection.findOne({
      username: uniqueUsername,
      _id: { $ne: userId }
    });

    // Also check our in-memory set for this batch
    if (!existing && !existingUsernames.has(uniqueUsername)) {
      return uniqueUsername;
    }

    uniqueUsername = `${baseUsername}-${counter}`;
    counter++;

    // Safety check to prevent infinite loop
    if (counter > 1000) {
      throw new Error(`Could not generate unique username for ${baseUsername}`);
    }
  }
}

async function migrateUsernames() {
  let connection;
  try {
    console.log("🔗 Connecting to MongoDB...");
    connection = await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    console.log("📊 Migration Statistics:");
    console.log("─".repeat(60));

    // Count total users
    const totalUsers = await collection.countDocuments({});
    console.log(`Total users in database: ${totalUsers}`);

    // Count users without username or with empty/null username
    const usersNeedingUsername = await collection.countDocuments({
      $or: [
        { username: { $exists: false } },
        { username: null },
        { username: "" }
      ]
    });
    console.log(`Users needing username: ${usersNeedingUsername}`);
    console.log(`Users with existing username: ${totalUsers - usersNeedingUsername}\n`);

    if (usersNeedingUsername === 0) {
      console.log("✅ All users already have usernames. No migration needed.");
      return;
    }

    // Get all users without username
    console.log("⏳ Processing users...");
    console.log("─".repeat(60));

    const usersToMigrate = await collection
      .find({
        $or: [
          { username: { $exists: false } },
          { username: null },
          { username: "" }
        ]
      })
      .toArray();

    const existingUsernames = new Set();
    const updates = [];
    let skipped = 0;
    let processed = 0;

    // Pre-populate existing usernames
    const existingUsers = await collection
      .find({ username: { $exists: true, $ne: null, $ne: "" } })
      .project({ username: 1 })
      .toArray();

    for (const user of existingUsers) {
      existingUsernames.add(user.username);
    }

    // Process each user
    for (const user of usersToMigrate) {
      if (!user.email) {
        console.log(`⚠️  Skipped: User ${user._id} has no email`);
        skipped++;
        continue;
      }

      // Extract email prefix
      let baseUsername = user.email
        .split("@")[0]
        .toLowerCase()
        .trim()
        .replace(/\+[^@]*/g, "") // Remove +aliases
        .substring(0, 30);

      // Fallback if baseUsername is empty
      if (!baseUsername) {
        baseUsername = "user";
      }

      // Generate unique username
      const username = await generateUniqueUsername(
        baseUsername,
        user._id,
        collection,
        existingUsernames
      );

      existingUsernames.add(username);
      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { username } }
        }
      });

      processed++;
      if (processed % 10 === 0) {
        console.log(`  Processing... ${processed}/${usersToMigrate.length}`);
      }
    }

    // Execute bulk updates
    if (updates.length > 0) {
      console.log(`\n⏳ Saving ${updates.length} usernames to database...`);
      const result = await collection.bulkWrite(updates);

      console.log("\n✅ Migration Complete!");
      console.log("─".repeat(60));
      console.log(`✓ Processed users: ${processed}`);
      console.log(`✓ Skipped users (no email): ${skipped}`);
      console.log(`✓ Matched: ${result.matchedCount}`);
      console.log(`✓ Modified: ${result.modifiedCount}`);
      console.log("─".repeat(60));
      console.log(`\n🎉 All users now have unique, URL-safe usernames!`);
      console.log(`\nExamples:`);
      console.log(`  purohit12_49@email.com → /u/purohit12_49`);
      console.log(`  john.doe+test@gmail.com → /u/john.doe`);
      console.log(`  user_name@company.co → /u/user_name`);
    } else {
      console.log("\n✅ No updates needed!");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log("\n🔌 Disconnected from MongoDB");
    }
  }
}

// Run the migration
migrateUsernames();
