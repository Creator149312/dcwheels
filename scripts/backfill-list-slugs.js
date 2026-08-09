/**
 * Backfill slugs for existing UnifiedList documents that don't have one.
 *
 * Run: node scripts/backfill-list-slugs.js
 *
 * Generates a permanent SEO slug from the list name. If the generated slug
 * is empty (e.g. name contains only special characters), the list is left
 * without a slug and will be served at /lists/[id].
 */
require("dotenv").config();
const mongoose = require("mongoose");
const UnifiedList = require("../models/unifiedlist");

function slugify(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not defined in environment");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const lists = await UnifiedList.find({
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
  }).select("name slug");

  console.log(`Found ${lists.length} lists without a slug`);

  let updated = 0;
  let skipped = 0;

  for (const list of lists) {
    const slug = slugify(list.name);
    if (!slug) {
      console.warn(`Skipping list "${list.name}" (${list._id}): no slugifiable name`);
      skipped++;
      continue;
    }

    list.slug = slug;
    await list.save();
    updated++;
    console.log(`Updated ${list._id} → ${slug}`);
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Total: ${lists.length}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
