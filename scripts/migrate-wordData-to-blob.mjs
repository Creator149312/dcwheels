/**
 * One-shot migration: walk every UnifiedList document and push any
 * base64 data-URL image stored inline in `items[].wordData`,
 * `items[].image`, or `items[].defaultImage` into Vercel Blob storage,
 * replacing the field with the resulting public URL.
 *
 * Base64 images embedded in Mongo documents are the single largest source
 * of payload bloat in this app — one 500 KB image balloons into ~670 KB of
 * base64 text in a document, every list-read drags that full payload over
 * the wire, and Atlas IOPS scales with document size. Replacing them with
 * a CDN URL drops each item reference to ~80 bytes.
 *
 * Usage:
 *   node scripts/migrate-wordData-to-blob.mjs --dry-run   # inspect only
 *   node scripts/migrate-wordData-to-blob.mjs             # actually upload
 *   node scripts/migrate-wordData-to-blob.mjs --limit 50  # bound the run
 *
 * Requires BLOB_READ_WRITE_TOKEN + MONGODB_URI in .env.local.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { put } from "@vercel/blob";
import sharp from "sharp";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has("--dry-run");
const limitArgIdx = process.argv.indexOf("--limit");
const LIMIT =
  limitArgIdx > 0 ? Number(process.argv[limitArgIdx + 1]) || Infinity : Infinity;

const IMAGE_FIELDS = ["wordData", "image", "defaultImage"];

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx < 0) return null;
  const header = dataUrl.slice(5, commaIdx);
  const payload = dataUrl.slice(commaIdx + 1);
  const isBase64 = header.includes(";base64");
  const mime = header.split(";")[0] || "application/octet-stream";
  const buffer = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");
  return { buffer, mime };
}

async function uploadBuffer(buffer, ownerId, listId) {
  const optimized = await sharp(buffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const path = `list-migration/${ownerId || "anon"}/${listId}-${Date.now()}.webp`;
  const uploaded = await put(path, optimized, {
    access: "public",
    addRandomSuffix: true,
    token: BLOB_TOKEN,
  });
  return { url: uploaded.url, bytes: optimized.length };
}

async function run() {
  if (!DRY_RUN && !BLOB_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN missing — cannot upload. Use --dry-run to preview.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const db = mongoose.connection.db;
  const col = db.collection("unifiedlists");

  // Only pull docs whose items contain a base64 payload. `$regex` against
  // ^data: is indexable-ish via string prefix and avoids scanning full values.
  const filter = {
    items: {
      $elemMatch: {
        $or: IMAGE_FIELDS.map((f) => ({ [f]: { $regex: "^data:image" } })),
      },
    },
  };

  const totalCandidates = await col.countDocuments(filter);
  console.log(`Lists with at least one base64 image: ${totalCandidates}`);

  const cursor = col.find(filter).limit(LIMIT);

  let scanned = 0;
  let migratedItems = 0;
  let skipped = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;
  let errors = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    scanned++;

    const ownerId = doc.userId?.toString?.() || "anon";
    const listId = doc._id.toString();
    let docChanged = false;

    for (let i = 0; i < (doc.items || []).length; i++) {
      const item = doc.items[i];
      for (const field of IMAGE_FIELDS) {
        const value = item?.[field];
        if (typeof value !== "string" || !value.startsWith("data:image")) continue;

        const parsed = parseDataUrl(value);
        if (!parsed) {
          skipped++;
          continue;
        }
        bytesBefore += value.length;

        if (DRY_RUN) {
          console.log(
            `  [dry] list=${listId} item=${i} field=${field} bytes=${value.length}`
          );
          migratedItems++;
          continue;
        }

        try {
          const { url, bytes } = await uploadBuffer(parsed.buffer, ownerId, listId);
          doc.items[i][field] = url;
          bytesAfter += url.length;
          migratedItems++;
          docChanged = true;
          // Gentle pacing — Vercel Blob allows bursts but a large migration
          // shouldn't hammer the upstream.
          await new Promise((r) => setTimeout(r, 25));
          console.log(
            `  ok list=${listId} item=${i} field=${field} ${value.length}B -> ${bytes}B`
          );
        } catch (err) {
          errors++;
          console.warn(
            `  ERR list=${listId} item=${i} field=${field}: ${err.message}`
          );
        }
      }
    }

    if (docChanged && !DRY_RUN) {
      await col.updateOne(
        { _id: doc._id },
        { $set: { items: doc.items } }
      );
    }
  }

  const savedBytes = bytesBefore - bytesAfter;
  console.log("\n--- Migration summary ---");
  console.log(`Docs scanned:       ${scanned}`);
  console.log(`Items migrated:     ${migratedItems}`);
  console.log(`Items skipped:      ${skipped}`);
  console.log(`Errors:             ${errors}`);
  console.log(`Bytes in base64:    ${bytesBefore.toLocaleString()}`);
  console.log(`Bytes as URLs:      ${bytesAfter.toLocaleString()}`);
  console.log(`Bytes saved:        ${savedBytes.toLocaleString()}`);
  console.log(`Mode:               ${DRY_RUN ? "DRY-RUN" : "WRITE"}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error("Migration failed:", err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
