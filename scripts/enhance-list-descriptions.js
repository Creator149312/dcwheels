#!/usr/bin/env node
/**
 * AI-powered description enhancer for high-quality TMDB lists.
 *
 * Reads data/high-quality-tmdb-lists.json, generates better SEO-friendly
 * descriptions for lists that have items, and writes the updated JSON back.
 *
 * Usage:
 *   node scripts/enhance-list-descriptions.js [--dry-run]
 */

import dotenv from "dotenv";
import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import OpenAI from "openai";

dotenv.config({ path: resolve(process.cwd(), ".env") });
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

const DATA_FILE = resolve(process.cwd(), "data/high-quality-tmdb-lists.json");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable.");
  process.exit(1);
}

function readJsonData() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch (err) {
    throw new Error(`Failed to read ${DATA_FILE}: ${err.message}`);
  }
}

function writeJsonData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
}

function stripCodeFences(text) {
  return text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const OPENING_VARIATIONS = shuffle([
  "Explore",
  "Discover",
  "Uncover",
  "Step into",
  "Dive into",
  "Find",
  "Immerse yourself in",
  "Get lost in",
  "A hand-picked journey through",
  "The ultimate guide to",
  "A curated spotlight on",
  "Celebrate",
  "Experience",
  "Wander through",
  "Revisit",
]);

let variationIndex = 0;

function nextOpening() {
  const opening = OPENING_VARIATIONS[variationIndex % OPENING_VARIATIONS.length];
  variationIndex++;
  return opening;
}

async function generateDescription(list) {
  const titles = list.items.map((m) => `"${m.title}"`).join(", ");
  const opening = nextOpening();

  const prompt = `You are an expert SEO copywriter for a movie discovery website.

List title: ${list.name}
Existing description: ${list.description || "None"}
Movies in this list: ${titles}

Write a new, compelling description for this list.

Rules:
- Start with: "${opening}"
- 1-2 sentences total, max 250 characters.
- Explain what the list is about and why movie lovers should care.
- Use natural, engaging language. Avoid generic filler.
- Do NOT use markdown, links, or wrap the output in quotes.
- NEVER start with the same phrasing as other descriptions.

Return ONLY the description text, nothing else.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85,
    max_tokens: 300,
  });

  let description = stripCodeFences(response.choices[0]?.message?.content || "");
  description = description.replace(/^["']|["']$/g, "").trim();

  // Ensure the requested opening is actually present.
  if (!description.toLowerCase().startsWith(opening.toLowerCase())) {
    description = `${opening} ${description.charAt(0).toLowerCase()}${description.slice(1)}`;
  }

  return description.slice(0, 300);
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { lists } = readJsonData();

  if (!Array.isArray(lists)) {
    console.error("No lists array found in JSON file.");
    process.exit(1);
  }

  const eligible = lists.filter((list) => Array.isArray(list.items) && list.items.length > 0);
  console.log(`Found ${eligible.length} lists with items.\n`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < eligible.length; i++) {
    const list = eligible[i];
    console.log(`[${i + 1}/${eligible.length}] ${list.name}`);

    try {
      const newDescription = await generateDescription(list);
      if (!newDescription) throw new Error("Empty description returned.");

      console.log(`  old: ${list.description || "(none)"}`.slice(0, 120));
      console.log(`  new: ${newDescription}`.slice(0, 120));

      if (!dryRun) {
        list.description = newDescription;
      }
      updated++;
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      failed++;
    }
  }

  if (!dryRun) {
    writeJsonData({ lists });
  }

  console.log("\n--- Summary ---");
  console.log(`Updated: ${updated}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Total:   ${eligible.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Description enhancement failed:", err);
  process.exit(1);
});
