/**
 * Migration script: Set isPublic: true for all UnifiedList documents
 * 
 * This script updates all unifiedlist documents in MongoDB to ensure isPublic is set to true.
 * - If a document already has isPublic field, it will be set to true
 * - If it doesn't have the field, it will be added and set to true
 * 
 * Usage: node scripts/migrate-isPublic-unifiedlists.mjs
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

async function migrateUnifiedLists() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("unifiedlists");

    console.log("\n📊 Migration Statistics:");
    console.log("─".repeat(50));

    // Check total list count
    const totalCount = await collection.countDocuments({});
    console.log(`Total lists in database: ${totalCount}`);

    // Count lists where isPublic is not true
    const missingOrFalseCount = await collection.countDocuments({
      $or: [
        { isPublic: { $exists: false } },
        { isPublic: false }
      ]
    });
    console.log(`Lists needing update: ${missingOrFalseCount}`);

    // Update all lists to set isPublic: true
    console.log("\n⏳ Updating lists...");
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
    console.log(`\n✓ Verified: ${updatedCount} lists now have isPublic: true`);

    if (updatedCount === totalCount) {
      console.log("✅ All lists successfully updated!");
    } else {
      console.warn(`⚠️ Warning: Only ${updatedCount}/${totalCount} lists have isPublic: true`);
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
migrateUnifiedLists();
