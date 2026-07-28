import mongoose from "mongoose";

/**
 * Shared utility to update tag counts incrementally.
 * Used by Mongoose hooks in Wheel, Post, and UnifiedList models.
 * 
 * @param {string[]} tags - List of tag slugs.
 * @param {1|-1} increment - 1 to add, -1 to subtract.
 * @param {'wheelCount'|'askCount'|'listCount'} field - Which count to update.
 */
export async function updateTagCounts(tags, increment, field) {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return;
  
  // Ensure the Tag model is registered
  const Tag = mongoose.models.Tag || (await import("@models/tag")).default;
  
  const ops = tags.map(t => ({
    updateOne: {
      filter: { slug: t },
      update: { 
        $inc: { [field]: increment },
        $setOnInsert: { 
          displayName: t.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          isPublic: true,
          aliases: []
        }
      },
      upsert: true,
    }
  }));

  try {
    // bulkWrite is atomic and extremely fast for high-volume updates
    await Tag.bulkWrite(ops, { ordered: false });
  } catch (err) {
    console.error(`[TagUpdateHelper] Failed to update ${field} for tags:`, tags, err);
  }
}
