/**
 * Migration script: Transfer "Favorites" list items to "Saved" list
 * 
 * This script:
 * 1. Finds all lists named "Favorites" or "favorites" (case-insensitive).
 * 2. Finds the user's "Saved" (SYS_SAVED) system list.
 * 3. Transfers all items from "Favorites" to "Saved" list (avoiding duplicates).
 * 4. Deletes the "Favorites" list.
 * 5. Updates SYS_SAVED lists to be public by default as per new policy.
 * 
 * Usage: node scripts/migrate-favorites-transfer.mjs
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not set");
  process.exit(1);
}

// Define minimal schemas for the migration
const ListItemSchema = new mongoose.Schema({
  type: String,
  word: String,
  wordData: String,
  entityType: String,
  entityId: mongoose.Schema.Types.Mixed,
  name: String,
  slug: String,
  image: String,
  status: String,
  addedAt: { type: Date, default: Date.now }
});

const ListSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  name: String,
  description: String,
  items: [ListItemSchema],
  isSystem: { type: Boolean, default: false },
  systemKey: String,
  isPublic: { type: Boolean, default: true },
  settings: {
    sortBy: { type: String, default: "recently-saved" },
    visibility: { type: String, default: "public" }
  }
}, { timestamps: true });

const UnifiedList = mongoose.models.UnifiedList || mongoose.model("UnifiedList", ListSchema, "unifiedlists");

async function runMigration() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // 1. Find all "Favorites" lists
    const favoritesLists = await UnifiedList.find({
      name: { $regex: /^favorites$/i },
      isSystem: { $ne: true }
    }).lean();

    console.log(`\n📦 Found ${favoritesLists.length} "Favorites" lists to process.`);

    let totalItemsTransferred = 0;
    let listsProcessed = 0;
    let errors = 0;

    for (const favList of favoritesLists) {
      try {
        const userId = favList.userId;

        // 2. Find or create the "Saved" (SYS_SAVED) list
        let savedList = await UnifiedList.findOne({ userId, systemKey: "SYS_SAVED" });

        if (!savedList) {
          // If SYS_SAVED doesn't exist, check for a list named "Saved"
          savedList = await UnifiedList.findOne({ 
            userId, 
            name: { $regex: /^saved$/i } 
          });

          if (savedList) {
            // Upgrade to system list
            savedList.isSystem = true;
            savedList.systemKey = "SYS_SAVED";
            savedList.name = "Saved";
            savedList.settings = { ...savedList.settings, visibility: "public" };
            await savedList.save();
          } else {
            // Create new SYS_SAVED list
            savedList = await UnifiedList.create({
              userId,
              name: "Saved",
              description: "Default list for items you've saved.",
              isSystem: true,
              systemKey: "SYS_SAVED",
              items: [],
              settings: { visibility: "public", sortBy: "recently-saved" },
              isPublic: true
            });
          }
        } else {
          // Ensure existing SYS_SAVED is public if we are touching it
          if (savedList.settings.visibility !== "public") {
            savedList.settings.visibility = "public";
            savedList.isPublic = true;
            await savedList.save();
          }
        }

        // 3. Transfer items
        const existingItems = savedList.items || [];
        const itemsToAdd = favList.items || [];
        
        // Helper to check for duplicates
        const isDuplicate = (item, list) => {
          if (item.type === "entity") {
            return list.some(i => i.type === "entity" && String(i.entityId) === String(item.entityId));
          }
          if (item.type === "word") {
            return list.some(i => i.type === "word" && i.word === item.word);
          }
          return false;
        };

        const newItems = itemsToAdd.filter(item => !isDuplicate(item, existingItems));
        
        if (newItems.length > 0) {
          await UnifiedList.updateOne(
            { _id: savedList._id },
            { $push: { items: { $each: newItems } } }
          );
          totalItemsTransferred += newItems.length;
        }

        // 4. Delete the "Favorites" list
        await UnifiedList.deleteOne({ _id: favList._id });
        
        listsProcessed++;
        if (listsProcessed % 10 === 0) {
          console.log(`Processed ${listsProcessed} lists...`);
        }
      } catch (err) {
        console.error(`❌ Error processing list ${favList._id}:`, err.message);
        errors++;
      }
    }

    // 5. Final check: Ensure all SYS_SAVED lists are public (even for users who didn't have Favorites)
    console.log("\n⏳ Ensuring all SYS_SAVED lists are set to public...");
    const updateResult = await UnifiedList.updateMany(
      { systemKey: "SYS_SAVED", "settings.visibility": { $ne: "public" } },
      { $set: { "settings.visibility": "public", isPublic: true } }
    );

    console.log(`\n✅ Migration Complete!`);
    console.log("─".repeat(50));
    console.log(`Favorites lists deleted:   ${listsProcessed}`);
    console.log(`Items transferred:        ${totalItemsTransferred}`);
    console.log(`Global SYS_SAVED updates: ${updateResult.modifiedCount}`);
    console.log(`Errors encountered:       ${errors}`);

  } catch (error) {
    console.error("❌ Migration failed:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed");
  }
}

runMigration();
