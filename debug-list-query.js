
require('dotenv').config();
const { connectMongoDB } = require('./lib/mongodb');
const mongoose = require('mongoose');

async function checkList() {
  try {
    await connectMongoDB();
    const listId = "6a4a5063d82e1efd18a69ccf";
    
    console.log(`Checking list ID: ${listId}`);
    
    const db = mongoose.connection.db;
    const list = await db.collection('unifiedlists').findOne({ 
      _id: new mongoose.Types.ObjectId(listId) 
    });

    if (!list) {
      console.log("No document found with that ID.");
      process.exit(0);
    }

    console.log("Document found:");
    console.log(JSON.stringify({
      _id: list._id,
      userId: list.userId,
      isPublic: list.isPublic,
      isSystem: list.isSystem,
      isDeleted: list.isDeleted,
      settings: list.settings,
      name: list.name
    }, null, 2));

  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

checkList();
