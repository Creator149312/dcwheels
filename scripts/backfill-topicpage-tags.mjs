/**
 * Backfill script: Add AI-generated tags to all TopicPages that have empty tags.
 *
 * Uses OpenAI gpt-4o-mini to generate 8-12 relevant lowercase kebab-case tags
 * from the page's title, type, and description.
 *
 * Run with:
 *   node scripts/backfill-topicpage-tags.mjs
 *
 * Options (env vars):
 *   DRY_RUN=true   — print tags without writing to DB
 *   OVERWRITE=true  — re-tag pages that already have tags
 *   BATCH_SIZE=5    — parallel requests per round (default: 5)
 *   DELAY_MS=500    — ms delay between rounds to respect rate limits (default: 500)
 *
 * Safe to re-run in non-OVERWRITE mode — skips pages that already have tags.
 */

import mongoose from "mongoose";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load from .env.local first (production preference), fall back to .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

// ── Config ──────────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DRY_RUN = process.env.DRY_RUN === "true";
const OVERWRITE = process.env.OVERWRITE === "true";
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || "5", 10);
const DELAY_MS = parseInt(process.env.DELAY_MS || "500", 10);

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI not found in .env.local");
  process.exit(1);
}
if (!OPENAI_API_KEY) {
  console.error("❌  OPENAI_API_KEY not found in .env.local");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ── Mongoose schema (minimal inline — avoids circular imports) ───────────────
const TopicPageSchema = new mongoose.Schema(
  {
    type: String,
    slug: String,
    title: {
      romaji: String,
      english: String,
      native: String,
      original: String,
      localized: String,
      default: String,
    },
    description: String,
    tags: { type: [String], default: [] },
    details: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

const TopicPage =
  mongoose.models.TopicPage ||
  mongoose.model("TopicPage", TopicPageSchema, "topicpages");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the best human-readable display title for a page doc. */
function getTitle(doc) {
  return (
    doc.title?.default ||
    doc.title?.english ||
    doc.title?.romaji ||
    doc.title?.localized ||
    doc.title?.original ||
    doc.slug
  );
}

/**
 * Build a prompt that gives the model enough context to produce
 * accurate, specific genre/theme/mood tags — not just generic ones.
 */
function buildPrompt(doc) {
  const title = getTitle(doc);
  const type = doc.type; // anime | movie | game | character | custom
  const desc = doc.description
    ? doc.description.slice(0, 400).replace(/\n+/g, " ")
    : "";
  const year = doc.details?.releaseYear || "";
  const studio = doc.details?.studio || "";
  const director = doc.details?.director || "";
  const platform = doc.details?.platform || "";

  const meta = [
    year && `Year: ${year}`,
    studio && `Studio: ${studio}`,
    director && `Director: ${director}`,
    platform && `Platform: ${platform}`,
  ]
    .filter(Boolean)
    .join(", ");

  return `
You are a tagging assistant for a content discovery platform.
Generate exactly 5 tags for the following ${type}:

Title: ${title}
${meta ? `Meta: ${meta}` : ""}
${desc ? `Description: ${desc}` : ""}

Rules:
- Tags must be lowercase kebab-case strings (e.g. "action", "slice-of-life", "open-world", "sci-fi")
- Include: genre(s), mood/tone, setting, themes, and audience type where relevant
- NO tags that are just the title itself
- NO tags like "anime", "movie", "game", "character" — the type is already known
- Be specific: prefer "psychological-thriller" over "thriller"; "mecha" over "robot"
- Return ONLY a valid JSON array of exactly 5 strings. No explanation, no markdown.

Example output: ["action", "dark-fantasy", "revenge", "strong-protagonist", "supernatural", "shonen"]
`.trim();
}

/**
 * Ask GPT-4o-mini to generate tags for a single TopicPage.
 * Retries once on parse failure.
 */
async function generateTags(doc) {
  const prompt = buildPrompt(doc);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.4,
      });

      const raw = res.choices[0]?.message?.content?.trim() || "";
      // Extract JSON array even if model wraps it in ```json``` fences
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) throw new Error(`No JSON array in response: ${raw}`);
      const tags = JSON.parse(match[0]);
      if (!Array.isArray(tags)) throw new Error("Parsed value is not an array");
      return tags
        .map((t) => String(t).toLowerCase().trim().replace(/\s+/g, "-"))
        .filter((t) => t.length > 0)
        .slice(0, 5);
    } catch (err) {
      if (attempt === 2) throw err;
      console.warn(`    ⚠  Parse failed (attempt ${attempt}), retrying…`);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔗  Connecting to MongoDB…");
  await mongoose.connect(MONGODB_URI);
  console.log("✅  Connected\n");

  if (DRY_RUN) console.log("🟡  DRY RUN mode — no writes will happen\n");
  if (OVERWRITE) console.log("🔄  OVERWRITE mode — re-tagging pages that already have tags\n");

  const filter = OVERWRITE ? {} : { $or: [{ tags: { $exists: false } }, { tags: { $size: 0 } }] };
  const total = await TopicPage.countDocuments(filter);
  console.log(`📄  Found ${total} TopicPage(s) to process\n`);

  if (total === 0) {
    console.log("Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  const cursor = TopicPage.find(filter)
    .select("_id type slug title description details tags")
    .lean()
    .cursor();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let batch = [];

  const processBatch = async (docs) => {
    await Promise.all(
      docs.map(async (doc) => {
        const title = getTitle(doc);
        try {
          const tags = await generateTags(doc);
          processed++;
          console.log(`  [${processed}/${total}] ${title}`);
          console.log(`         tags: ${tags.join(", ")}`);

          if (!DRY_RUN) {
            await TopicPage.updateOne(
              { _id: doc._id },
              { $set: { tags } }
            );
          }
          succeeded++;
        } catch (err) {
          processed++;
          failed++;
          console.error(`  [${processed}/${total}] ❌  ${title}: ${err.message}`);
        }
      })
    );
  };

  for await (const doc of cursor) {
    batch.push(doc);
    if (batch.length >= BATCH_SIZE) {
      await processBatch(batch);
      batch = [];
      if (DELAY_MS > 0) await sleep(DELAY_MS);
    }
  }

  // Process remaining docs
  if (batch.length > 0) {
    await processBatch(batch);
  }

  console.log("\n─────────────────────────────────────────");
  console.log(`✅  Done. ${succeeded} succeeded, ${failed} failed out of ${total} total.`);
  if (DRY_RUN) console.log("🟡  DRY RUN — no changes were written to the database.");
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
