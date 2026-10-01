/**
 * Backfill compound slugs for existing Wheel documents that don't have one.
 *
 * Pattern: /wheels/[slug]-[id]
 *
 * Keeps existing slugs (Admin/curated wheels) untouched.
 *
 * Run: node scripts/backfill-wheel-slugs.js
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config(); // fallback to .env if .env.local isn't present
const mongoose = require("mongoose");
const { slugify: transliterateSlug } = require("transliteration");

function createCompoundSlug(title, id, maxLength = 40) {
  const idStr = String(id);
  if (!title || !title.trim() || !idStr) return idStr;

  let cleanSlug = transliterateSlug(title, {
    lowercase: true,
    separator: "-",
    trim: true,
  });

  cleanSlug = cleanSlug.replace(/-+/g, "-");

  if (cleanSlug.length > maxLength) {
    cleanSlug = cleanSlug.slice(0, maxLength).replace(/-[^-]*$/, "");
  }

  cleanSlug = cleanSlug.replace(/^-+|-+$/g, "");

  if (!cleanSlug) return idStr;

  return `${cleanSlug}-${idStr}`;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not defined in environment (.env.local or .env)");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const wheelsCol = mongoose.connection.db.collection("wheels");

  // Only target wheels where slug is missing, null, or empty.
  // Existing slugs (admin/verified wheels) are deliberately left untouched.
  const query = {
    $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
  };

  const totalToMigrate = await wheelsCol.countDocuments(query);
  console.log(`Found ${totalToMigrate} wheels needing compound slugs.`);

  if (totalToMigrate === 0) {
    console.log("All wheels already have a slug. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // Support command-line arguments:
  // --limit=2 (process only N wheels for testing)
  // --dry-run (preview without modifying database)
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const maxLimit = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
  const isDryRun = args.includes("--dry-run");

  if (isDryRun) {
    console.log("🔍 [DRY RUN MODE]: No database writes will be executed.\n");
  }
  if (maxLimit) {
    console.log(`⚙️ [LIMIT APPLIED]: Processing at most ${maxLimit} wheel(s).\n`);
  }

  let queryBuilder = wheelsCol.find(query).project({ _id: 1, title: 1 });
  if (maxLimit) {
    queryBuilder = queryBuilder.limit(maxLimit);
  }

  const cursor = queryBuilder;
  const batchSize = 500;
  let bulkOps = [];
  let processed = 0;
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const compoundSlug = createCompoundSlug(doc.title || "wheel", doc._id);

    console.log(`[SAMPLE ${processed + 1}]`);
    console.log(`  ID:    ${doc._id}`);
    console.log(`  Title: "${doc.title}"`);
    console.log(`  Slug:  "${compoundSlug}"`);
    console.log(`  URL:   /wheels/${compoundSlug}\n`);

    if (!isDryRun) {
      bulkOps.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { slug: compoundSlug } },
        },
      });
    }

    processed++;

    if (!isDryRun && bulkOps.length >= batchSize) {
      const res = await wheelsCol.bulkWrite(bulkOps);
      updated += res.modifiedCount;
      console.log(`Processed ${processed}/${totalToMigrate} (Modified: ${updated})...`);
      bulkOps = [];
    }
  }

  if (!isDryRun && bulkOps.length > 0) {
    const res = await wheelsCol.bulkWrite(bulkOps);
    updated += res.modifiedCount;
  }

  if (isDryRun) {
    console.log(`Dry run complete: Simulated ${processed} wheel(s). Database untouched.`);
  } else {
    console.log(`\nMigration Complete: Processed ${processed}, Modified ${updated} wheel(s).`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Wheel slug backfill failed:", err);
  process.exit(1);
});
