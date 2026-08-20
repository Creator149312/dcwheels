#!/usr/bin/env node
/**
 * One-time migration: import existing high-quality TMDB lists from
 * data/high-quality-tmdb-lists.json into UnifiedList documents.
 *
 * Rules:
 *   - Only lists with at least one item are migrated.
 *   - Lists are distributed round-robin across the supplied OWNER_IDS.
 *   - migrated lists are isPublic: false, indexed: false.
 *   - Items are stored as entity type "movie" with slug [tmdbId]-[slugified title].
 *
 * Usage:
 *   node scripts/migrate-high-quality-lists-to-unifiedlist.js [--dry-run]
 */

import dotenv from "dotenv";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import { connectMongoDB } from "../lib/mongodb.js";
import { slugify, normalizeTag } from "../lib/slug.js";
import { createImmutableGlobalSlug } from "../utils/UrlHandler.js";
import UnifiedList from "../models/unifiedlist.js";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const DATA_FILE = resolve(process.cwd(), "data/high-quality-tmdb-lists.json");

const OWNER_IDS = [
  "6a4916864e84a6766406ad85",
  "6a4916b84e84a6766406ada0",
  "6a4916934e84a6766406ad8e",
];

function normalizeTags(tags) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return ["movies", "tmdb-verified"];
  }
  return tags.map((t) => normalizeTag(t)).filter(Boolean);
}

function readJsonData() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to read ${DATA_FILE}: ${err.message}`);
  }
}

async function uniqueNameForUser(baseName, userId) {
  let candidate = baseName.slice(0, 100);
  if (!(await UnifiedList.exists({ userId, name: candidate, isDeleted: { $ne: true } }))) {
    return candidate;
  }

  let n = 2;
  while (true) {
    const suffix = ` (${n})`;
    candidate = baseName.slice(0, 100 - suffix.length) + suffix;
    if (!(await UnifiedList.exists({ userId, name: candidate, isDeleted: { $ne: true } }))) {
      return candidate;
    }
    n++;
    if (n > 100) throw new Error(`Unable to generate a unique name for "${baseName}".`);
  }
}

function buildItemSlug(movie) {
  const id = movie.tmdbId;
  const title = movie.title;
  if (!id || !title) return null;
  return `${id}-${slugify(title)}`;
}

function buildListItems(items) {
  return items
    .map((movie) => {
      const slug = buildItemSlug(movie);
      if (!slug || !movie.title) return null;
      return {
        type: "entity",
        entityType: "movie",
        entityId: movie.tmdbId,
        name: movie.title,
        slug,
        image: movie.posterUrl || null,
      };
    })
    .filter(Boolean);
}

async function migrateList(list, ownerId, dryRun) {
  const items = Array.isArray(list.items) ? list.items : [];
  if (items.length === 0) {
    console.log(`  skipped (no items): ${list.name}`);
    return null;
  }

  const finalName = await uniqueNameForUser(list.name, ownerId);
  const idForSlug = new mongoose.Types.ObjectId().toString();
  const slug = await createImmutableGlobalSlug({ title: finalName, id: idForSlug });
  const listItems = buildListItems(items);

  if (listItems.length === 0) {
    console.log(`  skipped (no valid items after mapping): ${list.name}`);
    return null;
  }

  if (dryRun) {
    console.log(`  dry-run: ${list.name} → ${finalName} (${listItems.length} items) owner ${ownerId}`);
    return {
      _id: idForSlug,
      userId: ownerId,
      name: finalName,
      description: (list.description || "").slice(0, 300),
      tags: normalizeTags(list.tags),
      items: listItems,
      isPublic: false,
      indexed: false,
      slug,
    };
  }

  const created = await UnifiedList.create({
    _id: idForSlug,
    userId: ownerId,
    name: finalName,
    description: (list.description || "").slice(0, 300),
    tags: normalizeTags(list.tags),
    items: listItems,
    isPublic: false,
    indexed: false,
    slug,
  });

  console.log(`  created: ${created.name} (${created.items.length} items) → ${created._id}`);
  return created;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  for (const id of OWNER_IDS) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error(`Invalid owner ObjectId: ${id}`);
      process.exit(1);
    }
  }

  await connectMongoDB();

  const { lists } = readJsonData();
  if (!Array.isArray(lists)) {
    console.error("No lists array found in JSON file.");
    process.exit(1);
  }

  const eligible = lists.filter((list) => Array.isArray(list.items) && list.items.length > 0);
  console.log(`\nMigrating ${eligible.length} of ${lists.length} lists...`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`Distributing across ${OWNER_IDS.length} owners.\n`);

  const summary = {
    created: 0,
    skipped: 0,
    byOwner: Object.fromEntries(OWNER_IDS.map((id) => [id, 0])),
  };

  for (let i = 0; i < eligible.length; i++) {
    const list = eligible[i];
    const ownerId = OWNER_IDS[i % OWNER_IDS.length];

    const created = await migrateList(list, ownerId, dryRun);
    if (created) {
      summary.created++;
      summary.byOwner[ownerId]++;
    } else {
      summary.skipped++;
    }
  }

  console.log("\n--- Summary ---");
  console.log(`Created: ${summary.created}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log("By owner:");
  for (const [id, count] of Object.entries(summary.byOwner)) {
    console.log(`  ${id}: ${count}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
