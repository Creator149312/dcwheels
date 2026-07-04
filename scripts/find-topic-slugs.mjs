
import mongoose from "mongoose";
import dotenv from "dotenv";
import TopicPage from "../models/topicpage.js";

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not found in environment.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");

    const samples = await TopicPage.find({}).limit(10).lean();
    if (samples.length === 0) {
      console.log("No TopicPage found in the database. Creating one for demonstration...");
      // Let's not create one yet, just report.
    } else {
      console.log("Sample TopicPages:");
      samples.forEach(s => {
        console.log(`- Type: ${s.type}, Slug: ${s.slug}, URL: /${s.type}/${s.slug}`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
