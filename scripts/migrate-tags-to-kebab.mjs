import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

/**
 * Migration script: Converts all tags across wheels, topicpages, posts, and unifiedlists
 * to canonical lowercase kebab-case (e.g. #LoveIsWhatILike -> love-is-what-i-like).
 * Also synchronizes and cleans up the canonical `tags` collection.
 */

function normalizeTag(input) {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .replace(/^#+/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in environment");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    console.log("Connected to MongoDB. Starting tag migration...");

    const collections = [
      { name: "wheels", field: "tags" },
      { name: "topicpages", field: "tags" },
      { name: "posts", field: "tags" },
      { name: "unifiedlists", field: "tags" },
    ];

    for (const { name, field } of collections) {
      console.log(`Processing collection: ${name}...`);
      const col = db.collection(name);
      const cursor = col.find(
        { [field]: { $exists: true, $ne: [] } },
        { projection: { _id: 1, [field]: 1 } }
      );

      let updatedCount = 0;
      const bulkOps = [];

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const currentTags = doc[field];
        if (!Array.isArray(currentTags)) continue;

        const cleanedTags = [
          ...new Set(
            currentTags
              .map((t) => (typeof t === "string" ? normalizeTag(t) : t))
              .filter(Boolean)
          ),
        ];

        // Check if tags changed
        const hasChanged =
          cleanedTags.length !== currentTags.length ||
          cleanedTags.some((t, i) => t !== currentTags[i]);

        if (hasChanged) {
          bulkOps.push({
            updateOne: {
              filter: { _id: doc._id },
              update: { $set: { [field]: cleanedTags } },
            },
          });
          updatedCount++;
        }

        if (bulkOps.length >= 500) {
          await col.bulkWrite(bulkOps);
          bulkOps.length = 0;
        }
      }

      if (bulkOps.length > 0) {
        await col.bulkWrite(bulkOps);
      }

      console.log(`✓ ${name}: updated ${updatedCount} documents with normalized tags.`);
    }

    // Clean canonical `tags` collection
    console.log("Normalizing canonical `tags` collection...");
    const tagsCol = db.collection("tags");
    const tagDocs = await tagsCol.find({}).toArray();
    let tagUpdates = 0;

    for (const tagDoc of tagDocs) {
      const cleanSlug = normalizeTag(tagDoc.slug);
      if (cleanSlug && cleanSlug !== tagDoc.slug) {
        try {
          await tagsCol.updateOne(
            { _id: tagDoc._id },
            { $set: { slug: cleanSlug } }
          );
          tagUpdates++;
        } catch (e) {
          // If collision with existing unique slug, remove redundant duplicate
          if (e.code === 11000) {
            await tagsCol.deleteOne({ _id: tagDoc._id });
          }
        }
      }
    }
    console.log(`✓ Canonical tags collection: cleaned ${tagUpdates} tag slugs.`);

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await client.close();
  }
}

run();
