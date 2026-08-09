import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function updateSpecificList() {
  const listId = "6a4a5063d82e1efd18a69ccf";
  
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("unifiedlists");

    console.log(`\n🔍 Looking for list with ID: ${listId}`);
    
    // Check if it exists
    const list = await collection.findOne({ _id: new mongoose.Types.ObjectId(listId) });
    
    if (!list) {
      console.log("❌ List not found.");
      process.exit(1);
    }

    console.log("Current status:", {
      isPublic: list.isPublic,
      visibility: list.settings?.visibility
    });

    console.log("\n⏳ Updating list...");
    const result = await collection.updateOne(
      { _id: new mongoose.Types.ObjectId(listId) },
      { 
        $set: { 
          isPublic: true,
          "settings.visibility": "public"
        } 
      }
    );

    if (result.modifiedCount > 0) {
      console.log("✅ Update successful!");
    } else {
      console.log("⚠️ List was already public or not modified.");
    }

    const updatedList = await collection.findOne({ _id: new mongoose.Types.ObjectId(listId) });
    console.log("Updated status:", {
      isPublic: updatedList.isPublic,
      visibility: updatedList.settings?.visibility
    });

  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

updateSpecificList();
