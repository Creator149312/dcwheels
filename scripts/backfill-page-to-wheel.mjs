import mongoose from "mongoose";
const { connect } = mongoose;

import Wheel from "../models/wheel.js";
import Page from "../models/page.js";
import dotenv from "dotenv";
dotenv.config();

async function backfillWheels() {
  try {
    await connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for backfill...");

    const pages = await Page.find({}).lean();
    console.log(`Found ${pages.length} pages to migrate.`);

    for (const page of pages) {
      if (!page.wheel) continue;

      await Wheel.findByIdAndUpdate(page.wheel, {
        $set: {
          slug: page.slug,
          indexed: page.indexed,
          content: page.content,
        }
      });
      console.log(`Migrated page: ${page.slug} to wheel ID: ${page.wheel}`);
    }

    console.log("Backfill complete! You can now delete the Page collection.");
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
}

backfillWheels();
