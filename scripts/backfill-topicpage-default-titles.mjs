import "dotenv/config";
import mongoose from "mongoose";

// --- Minimal Schema Definition (Avoids Next.js alias issues) ---
const TopicPageSchema = new mongoose.Schema(
  {
    type: String,
    relatedId: mongoose.Schema.Types.Mixed,
    title: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const TopicPage =
  mongoose.models.TopicPage ||
  mongoose.model("TopicPage", TopicPageSchema);

// --- Helpers ---

function resolveDefaultTitle(title) {
  if (!title || typeof title !== "object") return null;
  if (title.default && String(title.default).trim() !== "") {
    return String(title.default).trim();
  }
  return (
    title.english ||
    title.localized ||
    title.romaji ||
    title.original ||
    title.native ||
    null
  );
}

function needsUpdate(title) {
  const def = title?.default;
  return !def || String(def).trim() === "";
}

// --- Main Script ---

async function run() {
  console.log("🚀 Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected.");

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Only touch documents that are missing title.default.
  const query = {
    $or: [
      { "title.default": { $exists: false } },
      { "title.default": null },
      { "title.default": "" },
    ],
  };

  const totalMissing = await TopicPage.countDocuments(query);
  console.log(`🔍 Found ${totalMissing} TopicPages missing title.default.`);

  if (totalMissing === 0) {
    console.log("🎉 Nothing to backfill. Exiting.");
    await mongoose.disconnect();
    return;
  }

  const cursor = TopicPage.find(query).cursor();

  for await (const doc of cursor) {
    try {
      if (!needsUpdate(doc.title)) {
        skippedCount++;
        continue;
      }

      const defaultTitle = resolveDefaultTitle(doc.title);
      if (!defaultTitle) {
        console.warn(
          `⚠️  No fallback title available for ${doc.type} ${doc.relatedId} (${doc._id})`
        );
        skippedCount++;
        continue;
      }

      // Use $set to add title.default while preserving other title variants.
      await TopicPage.updateOne(
        { _id: doc._id },
        { $set: { "title.default": defaultTitle } }
      );

      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`📝 Backfilled ${updatedCount}/${totalMissing}...`);
      }
    } catch (err) {
      errorCount++;
      console.error(
        `❌ Failed to update ${doc.type} ${doc.relatedId} (${doc._id}):`,
        err.message
      );
    }
  }

  console.log("\n✅ Backfill complete.");
  console.log(`   Updated: ${updatedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Errors:  ${errorCount}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
