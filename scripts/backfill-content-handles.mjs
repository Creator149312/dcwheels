/**
 * Migration script: Backfill authorHandle for all existing Posts and Wheels
 * 
 * Logic:
 * - Fetches all users and their usernames
 * - Updates all Post documents matching userId with authorHandle
 * - Updates all Wheel documents matching createdBy (email) with authorHandle and authorName
 * 
 * Usage: node scripts/backfill-content-handles.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function backfill() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;
    console.log("✅ Connected to MongoDB\n");

    const usersCol = db.collection("users");
    const postsCol = db.collection("posts");
    const wheelsCol = db.collection("wheels");

    console.log("🔍 Fetching users...");
    const users = await usersCol.find({}, { projection: { _id: 1, email: 1, username: 1, name: 1 } }).toArray();
    console.log(`Found ${users.length} users.`);

    // 1. Create maps for lookups
    const idToUsername = new Map();
    const emailToUsername = new Map();
    const emailToName = new Map();

    for (const u of users) {
      if (u.username) {
        idToUsername.set(u._id.toString(), u.username);
        emailToUsername.set(u.email, u.username);
      }
      if (u.name) {
        emailToName.set(u.email, u.name);
      }
    }

    // 2. Backfill Posts
    console.log("📝 Backfilling Posts...");
    const posts = await postsCol.find({ authorHandle: { $exists: false } }, { projection: { userId: 1 } }).toArray();
    console.log(`Found ${posts.length} posts needing backfill.`);

    let postUpdates = 0;
    for (const post of posts) {
      const username = idToUsername.get(post.userId.toString());
      if (username) {
        await postsCol.updateOne({ _id: post._id }, { $set: { authorHandle: username } });
        postUpdates++;
      }
    }
    console.log(`✅ Updated ${postUpdates} posts.`);

    // 3. Backfill Wheels
    console.log("🎡 Backfilling Wheels...");
    const wheels = await wheelsCol.find({ 
      $or: [
        { authorHandle: { $exists: false } }, 
        { authorName: { $exists: false } }
      ] 
    }, { projection: { createdBy: 1 } }).toArray();
    console.log(`Found ${wheels.length} wheels needing backfill.`);

    const wheelOps = [];
    for (const wheel of wheels) {
      const username = emailToUsername.get(wheel.createdBy);
      const name = emailToName.get(wheel.createdBy);
      
      const update = {};
      if (username) update.authorHandle = username;
      if (name) update.authorName = name;

      if (Object.keys(update).length > 0) {
        wheelOps.push({
          updateOne: {
            filter: { _id: wheel._id },
            update: { $set: update }
          }
        });
      }
    }

    if (wheelOps.length > 0) {
      console.log(`⏳ Executing bulk update for ${wheelOps.length} wheels...`);
      const result = await wheelsCol.bulkWrite(wheelOps);
      console.log(`✅ Updated ${result.modifiedCount} wheels.`);
    }

    console.log("\n✨ Migration complete!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

backfill();
