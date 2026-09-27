// app/api/unifiedlist/anime-characters/route.js
// Separate, isolated endpoint for seeding a new list with characters from an anime.
// Does NOT modify the generic POST /api/unifiedlist behavior.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";
import { createImmutableGlobalSlug, getListUrl } from "@utils/UrlHandler";
import { fetchAllAnimeCharacters, fetchWithTimeout } from "@lib/topicPage";
import { slugify } from "@lib/slug";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VALID_FORMATS = ["standard", "tiered"];
const TIER_KEYS = ["S", "A", "B", "C", "D"];
const MAX_TIERED_CHARACTERS = 40; // only tier the recognizable cast; long-tail stays unranked

// Tier assignment model: gpt-5-mini honors reasoning_effort (unlike full gpt-5,
// which always reasons and burns the token budget on thinking). Classification
// doesn't need the flagship; mini + low effort ≈ gpt-4o speed with fresher knowledge.
const TIER_MODEL = "gpt-5-mini";
const TIER_FALLBACK_MODEL = "gpt-4o"; // used when the reasoning model returns empty content
// Description generation stays on gpt-4o-mini — proven reliable with
// temperature + max_tokens, while GPT-5 reasoning models return empty content.
const DESCRIPTION_MODEL = "gpt-4o-mini";

/**
 * Trim text to the last complete sentence within the limit.
 * Avoids mid-word / mid-sentence cutoffs in generated content.
 */
function trimAtSentenceBoundary(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  const window = text.slice(0, maxChars);
  // Find the last sentence-ending punctuation followed by a space or end
  const lastBoundary = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
    window.lastIndexOf(".\n"),
    window.lastIndexOf("!\n"),
    window.lastIndexOf("?\n")
  );
  if (lastBoundary > maxChars * 0.4) {
    return window.slice(0, lastBoundary + 1).trim();
  }
  // No good boundary found — fall back to last space to avoid splitting a word
  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).trim();
}

// Rotating structural templates so generated descriptions don't all read
// the same. Each has a distinct opening hook, rhythm, and call-to-action.
// Instructions are functions so animeName is interpolated at call time,
// not at module load (which would throw a ReferenceError).
const DESCRIPTION_STYLES = [
  {
    key: "debate",
    instruction: (animeName) => `Open with a bold hot take or unpopular opinion about "${animeName}" that fans love to argue about. Then describe the list as a way to settle (or fuel) that debate.`,
  },
  {
    key: "nostalgia",
    instruction: (animeName) => `Open with a nostalgic or emotional angle — first impressions, iconic moments, or why "${animeName}" characters stick with people. Frame the list as a celebration.`,
  },
  {
    key: "challenge",
    instruction: (animeName) => `Open with a direct challenge to the reader ("Think you know every ${animeName} character?"). Frame the list as a test of knowledge and the tier ranking as the ultimate verdict.`,
  },
  {
    key: "story",
    instruction: (animeName) => `Open with a one-sentence scene or moment from "${animeName}" (no spoilers, keep it generic). Then transition into how the list captures the full cast that made those moments possible.`,
  },
  {
    key: "guide",
    instruction: (animeName) => `Open with a helpful, guide-like tone — for newcomers wondering where to start or veterans revisiting "${animeName}". Frame the list as the definitive reference.`,
  },
  {
    key: "community",
    instruction: (animeName) => `Open with the community angle — watch parties, cosplay, fan art, shipping wars around "${animeName}" characters. Frame the list as a shared playground for fans.`,
  },
];

/**
 * Extract a JSON payload from a model response. GPT-5 sometimes wraps output
 * in ```json fences despite instructions — strip them before parsing.
 */
function extractJson(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  // Fall back to the outermost braces/object if extra prose surrounds it
  if (!text.startsWith("{") && !text.startsWith("[")) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) text = text.slice(start, end + 1);
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Pull message content from a completion with diagnostics for GPT-5 quirks:
 * reasoning models can return empty content when finish_reason = "length"
 * (reasoning tokens consumed the budget).
 */
function getCompletionContent(res, label) {
  const choice = res.choices?.[0];
  const content = choice?.message?.content?.trim() || "";
  if (!content) {
    console.error(`${label}: empty completion`, JSON.stringify({
      finishReason: choice?.finish_reason,
      usage: res.usage,
      refusal: choice?.message?.refusal,
    }));
  }
  return content;
}

/**
 * Fetch the anime's synopsis from AniList to ground the AI description in
 * real plot detail — without it, the model writes generic "fans are debating"
 * filler that could describe any anime.
 */
async function fetchAnimeSynopsis(animeId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        description
        genres
      }
    }
  `;
  try {
    const res = await fetchWithTimeout("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: animeId } }),
      next: { revalidate: 86400 },
    }, 8000);
    if (!res.ok) return null;
    const data = await res.json();
    const media = data?.data?.Media;
    if (!media) return null;
    // Strip AniList's HTML tags (<br>, <i>, etc.) and cap length
    const synopsis = String(media.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600);
    return {
      synopsis,
      genres: Array.isArray(media.genres) ? media.genres.slice(0, 4) : [],
    };
  } catch {
    return null;
  }
}

function buildDescriptionPrompt(listTitle, animeName, style, context = null) {
  const contextBlock = context?.synopsis
    ? `
ABOUT THIS ANIME (use these real details — do NOT stay generic):
- Synopsis: ${context.synopsis}
- Genres: ${(context.genres || []).join(", ") || "n/a"}
- Main characters featured in this list: ${(context.topCharacters || []).join(", ") || "n/a"}
`
    : "";

  return `Write a natural, engaging description for a fan-made list titled "${listTitle}" about characters from the anime "${animeName}".
${contextBlock}
STRUCTURE FOR THIS DESCRIPTION:
${style.instruction(animeName)}

Rules:
- STRICT: between 120 and 150 words total — count carefully and finish your final sentence completely
- 2 short paragraphs separated by a blank line
- MUST reference at least one specific character name or real plot/setting element from the anime — generic "fans debate the best character" filler is a failure
- Sound like a genuine anime fan of THIS show, not a corporate press release
- BANNED phrases: "curated collection", "comprehensive list", "delve into", "embark on a journey", "if you're as obsessed", "you'll love this", "dives deep", "you won't want to miss", "brings something unique to the table"
- Do NOT start with "If you" — vary the opening
- No hashtags, no markdown, no quotes
- Plain text only
- Mention the tier ranking feature briefly (one sentence max)
- IMPORTANT: end with a complete sentence. Do not trail off.`;
}

async function generateHumanDescription(listTitle, animeName, context = null) {
  try {
    // Pick a random style so each list reads differently
    const style = DESCRIPTION_STYLES[Math.floor(Math.random() * DESCRIPTION_STYLES.length)];
    const prompt = buildDescriptionPrompt(listTitle, animeName, style, context);

    const res = await openai.chat.completions.create({
      model: DESCRIPTION_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 300,
    });

    let text = getCompletionContent(res, "AI description");
    // Strip surrounding quotes if the model wrapped the output
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    if (text.startsWith("'") && text.endsWith("'")) text = text.slice(1, -1);

    // Safety clamp at sentence boundary — the prompt targets 120-150 words,
    // so this should rarely trigger; when it does, it ends cleanly.
    return trimAtSentenceBoundary(text, 1000);
  } catch (err) {
    console.error("AI description generation failed:", err.message);
    return "";
  }
}

/**
 * Run one tier-ranking completion against a given model.
 * GPT-5 models get reasoning_effort: "low" + max_completion_tokens;
 * gpt-4o fallback uses classic max_tokens. Returns parsed tier map or null.
 */
async function runTierCompletion(prompt, model) {
  const isGpt5 = model.startsWith("gpt-5");
  const res = await openai.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    ...(isGpt5
      ? { reasoning_effort: "low", max_completion_tokens: 3000 }
      : { temperature: 0.9, max_tokens: 1200 }),
  });

  const raw = getCompletionContent(res, `AI tier assignment (${model})`);
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed !== "object") return null;

  // Sanitize: only keep valid tier keys
  const tiers = {};
  for (const [id, tier] of Object.entries(parsed)) {
    const t = String(tier).toUpperCase().trim();
    if (TIER_KEYS.includes(t)) tiers[String(id)] = t;
  }
  return Object.keys(tiers).length > 0 ? tiers : null;
}

/**
 * Ask AI to assign S/A/B/C/D tiers to the anime's top characters.
 * Intentionally includes a few debatable placements — a fan-favorite dropped
 * one tier, a side character bumped one up — to spark comments and remakes.
 * Tries gpt-5-mini (low reasoning) first, falls back to gpt-4o when the
 * reasoning model burns its budget on thinking and returns nothing.
 * Returns { [anilistCharId]: "S"|"A"|"B"|"C"|"D" }; {} on any failure.
 */
async function generateTierAssignments(animeName, characters) {
  try {
    // Only tier the most recognizable characters (AniList returns role-sorted)
    const cast = characters.slice(0, MAX_TIERED_CHARACTERS).map((c) => ({
      id: String(c.id),
      name: c.name?.full || c.name?.native || "Unknown",
    }));

    const prompt = `You are ranking characters from the anime "${animeName}" into tiers for a fan-made tier list.

Characters (JSON):
${JSON.stringify(cast)}

Assign each character a tier: S (iconic/legendary), A (great), B (good), C (okay), D (weak/forgettable).

Rules:
- Judge by a mix of popularity, writing quality, and impact on the story — not just power level
- Aim for a rough pyramid: few S, more A/B, most C/D
- IMPORTANT: include 3-5 deliberately DEBATABLE placements that fans will argue about — e.g. drop a beloved character one tier lower than expected, or bump a divisive side character one tier up. These should be defensible but provocative, never random or absurd (don't put the protagonist in D)
- If you don't recognize a character, assign based on their apparent role or give them C

Return ONLY valid JSON, no markdown: an object mapping each character id to its tier letter.
Example: {"123": "S", "456": "B"}`;

    const tiers =
      (await runTierCompletion(prompt, TIER_MODEL)) ||
      (await runTierCompletion(prompt, TIER_FALLBACK_MODEL));

    return tiers || {};
  } catch (err) {
    console.error("AI tier assignment failed:", err.message);
    return {};
  }
}

export async function POST(req) {
  await connectMongoDB();

  try {
    const userId = await sessionUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      animeId,        // AniList numeric ID
      animeName,      // Display name for title suggestion
      animeSlug,      // e.g. "21-one-piece"
      isPublic = true,
      listName,       // optional custom title override
    } = body;

    if (!animeId || Number.isNaN(Number(animeId))) {
      return NextResponse.json({ error: "Anime ID is required" }, { status: 400 });
    }

    // Force Standard List format for SEO seeding
    const listFormat = "standard";

    // Default SEO title, or user-supplied override
    const baseName = typeof listName === "string" && listName.trim()
      ? listName.trim().slice(0, 100)
      : `${animeName || "Anime"} Characters — Complete List & Tier Ranking`;

    // Prevent duplicate list names for the same user
    const existing = await UnifiedList.findOne({
      userId,
      name: baseName,
      isDeleted: { $ne: true },
    }).lean();

    if (existing) {
      return NextResponse.json(
        { error: "A list with this name already exists" },
        { status: 409 }
      );
    }

    // Fetch ALL characters from AniList (paginated, capped at 200 to match list limit)
    const characters = await fetchAllAnimeCharacters(Number(animeId), 250);

    if (!Array.isArray(characters) || characters.length === 0) {
      return NextResponse.json(
        { error: "No characters found for this anime" },
        { status: 404 }
      );
    }

    // Deduplicate by character ID to prevent repeats from AniList pagination or API quirks
    const seenCharIds = new Set();
    const uniqueCharacters = characters.filter((char) => {
      const id = String(char?.id || "").trim();
      if (!id || seenCharIds.has(id)) return false;
      seenCharIds.add(id);
      return true;
    });

    if (uniqueCharacters.length === 0) {
      return NextResponse.json(
        { error: "No valid unique characters found for this anime" },
        { status: 404 }
      );
    }

    // Fetch the anime synopsis to ground the description in real plot detail
    const animeContext = await fetchAnimeSynopsis(Number(animeId));
    const topCharacters = uniqueCharacters
      .slice(0, 6)
      .map((c) => c.name?.full || c.name?.native)
      .filter(Boolean);
    const descContext = animeContext ? { ...animeContext, topCharacters } : { synopsis: "", genres: [], topCharacters };

    // Generate description + tier assignments in parallel (independent tasks)
    const [aiDescription, tierAssignments] = await Promise.all([
      generateHumanDescription(baseName, animeName || "this anime", descContext),
      generateTierAssignments(animeName || "this anime", uniqueCharacters),
    ]);
    const fallbackDescription = `Character list for ${animeName || "the selected anime"}.`;
    // Final safety clamp at sentence boundary — never cuts mid-word
    const description = trimAtSentenceBoundary(aiDescription || fallbackDescription, 1000);

    // Build entity items from unique character nodes, merging AI tier assignments
    const items = uniqueCharacters.map((char, idx) => ({
      type: "entity",
      entityType: "character",
      entityId: String(char.id),
      name: char.name?.full || char.name?.native || `Character ${idx + 1}`,
      slug: `${char.id}-${slugify(char.name?.full || char.name?.native || `character-${char.id}`)}`,
      image: char.image?.large || char.image?.medium || null,
      addedAt: new Date(),
      rank: idx + 1,
      ...(tierAssignments[String(char.id)] ? { tier: tierAssignments[String(char.id)] } : {}),
    }));

    // Create the list with a global slug
    const idForSlug = new mongoose.Types.ObjectId().toString();
    const slug = await createImmutableGlobalSlug({ title: baseName, id: idForSlug });

    const newList = await UnifiedList.create({
      _id: idForSlug,
      userId,
      name: baseName,
      description,
      tags: ["anime", "characters", slugify(animeName || "")].filter(Boolean),
      items,
      isPublic: typeof isPublic === "boolean" ? isPublic : true,
      slug,
      format: listFormat,
    });

    const formatted = {
      id: newList._id,
      name: newList.name,
      slug: newList.slug,
      description: newList.description,
      tags: newList.tags,
      createdAt: newList.createdAt,
      updatedAt: newList.updatedAt,
      isPublic: newList.isPublic ?? true,
      isSystem: newList.isSystem ?? false,
      format: newList.format || "standard",
      tierConfig: newList.tierConfig,
      items: newList.items,
    };

    return NextResponse.json(
      { list: formatted, url: getListUrl(formatted) },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/unifiedlist/anime-characters error:", err);
    return NextResponse.json(
      { error: "Failed to create anime character list", details: err.message },
      { status: 500 }
    );
  }
}
