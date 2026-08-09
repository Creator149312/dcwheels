/**
 * Migration script: Set isPublic: true for all Wheel documents
 * 
 * This script updates all wheel documents in MongoDB to ensure isPublic is set to true.
 * - If a document already has isPublic field, it will be set to true
 * - If it doesn't have the field, it will be added and set to true
 * 
 * Usage: node scripts/migrate-isPublic-wheels.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Get MongoDB connection string from environment
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function migrateWheels() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("wheels");

    console.log("\n📊 Migration Statistics:");
    console.log("─".repeat(50));

    // Check total wheel count
    const totalCount = await collection.countDocuments({});
    console.log(`Total wheels in database: ${totalCount}`);

    // Count wheels where isPublic is not true
    const missingOrFalseCount = await collection.countDocuments({
      $or: [
        { isPublic: { $exists: false } },
        { isPublic: false }
      ]
    });
    console.log(`Wheels needing update: ${missingOrFalseCount}`);

    // Update all wheels to set isPublic: true
    console.log("\n⏳ Updating wheels...");
    const result = await collection.updateMany(
      {}, // Filter: all documents
      { $set: { isPublic: true } } // Update: set isPublic to true
    );

    console.log("\n✅ Migration Complete!");
    console.log("─".repeat(50));
    console.log(`Matched documents: ${result.matchedCount}`);
    console.log(`Modified documents: ${result.modifiedCount}`);

    // Verify the update
    const updatedCount = await collection.countDocuments({ isPublic: true });
    console.log(`\n✓ Verified: ${updatedCount} wheels now have isPublic: true`);

    if (updatedCount === totalCount) {
      console.log("✅ All wheels successfully updated!");
    } else {
      console.warn(`⚠️ Warning: Only ${updatedCount}/${totalCount} wheels have isPublic: true`);
    }

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  } finally {
    console.log("\n🔌 Closing database connection...");
    await mongoose.connection.close();
    console.log("✅ Connection closed");
  }
}

// Run migration
migrateWheels();
