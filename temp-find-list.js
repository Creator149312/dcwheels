import mongoose from "mongoose";
import dotenv from "dotenv";
import UnifiedList from "./models/unifiedlist.js";

dotenv.config();

async function findList() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const list = await UnifiedList.findOne({ name: /My SuperHero Picks/i });
    if (list) {
      console.log(JSON.stringify(list, null, 2));
    } else {
      const allLists = await UnifiedList.find({}, 'name slug');
      console.log("List not found. Available list names:", allLists.map(l => l.name));
    }
    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}

findList();
