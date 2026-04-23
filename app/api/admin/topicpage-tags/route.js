/**
 * Admin API for TopicPage tag management.
 *
 * GET  /api/admin/topicpage-tags?page=1&limit=20&filter=empty|all&q=search
 *   Returns paginated TopicPages with their current tags.
 *
 * POST /api/admin/topicpage-tags  { id }
 *   Generates AI tags for a single TopicPage using its title/type/description.
 *   Returns { id, tags } — does NOT write to DB. Client confirms before saving.
 *
 * PATCH /api/admin/topicpage-tags  { id, tags }
 *   Saves the given tags array to the TopicPage document.
 *
 * POST /api/admin/topicpage-tags/batch  { ids[] }
 *   Generates + saves tags for multiple pages (empty-only by default).
 *   Returns a stream of ndjson progress events.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";
import OpenAI from "openai";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function requireAdmin(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== ADMIN_EMAIL) return false;
  return true;
}

// ── Shared AI tag generation ─────────────────────────────────────────────────
function getTitle(doc) {
  return (
    doc.title?.default ||
    doc.title?.english ||
    doc.title?.romaji ||
    doc.title?.localized ||
    doc.title?.original ||
    doc.slug ||
    "Untitled"
  );
}

function buildPrompt(doc) {
  const title = getTitle(doc);
  const type = doc.type;
  const isCharacter = type === "character";
  const aiCount = isCharacter ? 4 : 5;
  const desc = doc.description
    ? doc.description.slice(0, 500).replace(/\n+/g, " ")
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
Generate exactly ${aiCount} tags for the following ${type}:

Title: ${title}
${meta ? `Meta: ${meta}` : ""}
${desc ? `Description: ${desc}` : ""}

Rules:
- Tags must be lowercase kebab-case strings (e.g. "action", "slice-of-life", "open-world", "sci-fi")
- Include: genre(s), mood/tone, setting, themes, and audience type where relevant
- NO tags that are just the title itself
- NO tags like "anime", "movie", "game", "character" — type is already known
- Be specific: prefer "psychological-thriller" over just "thriller"
- Return ONLY a valid JSON array of exactly ${aiCount} strings. No explanation, no markdown.

Example: ["action", "dark-fantasy", "revenge", "supernatural", "shonen"]
`.trim();
}

async function generateTagsForDoc(doc) {
  const isCharacter = doc.type === "character";
  const aiCount = isCharacter ? 4 : 5;
  const prompt = buildPrompt(doc);
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.4,
    });
    const raw = res.choices[0]?.message?.content?.trim() || "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) {
      if (attempt === 2) throw new Error(`No JSON array in response: ${raw}`);
      continue;
    }
    const cleanTag = (t) =>
      String(t)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s-]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const aiTags = JSON.parse(match[0]).map(cleanTag).filter((t) => t.length > 0).slice(0, aiCount);

    // Derive a slug-specific tag by stripping the leading numeric ID.
    // e.g. "1539104-kaisen-execution" → "kaisen-execution"
    // This creates a unique fingerprint tag for cross-collection discovery.
    const slugTag = doc.slug
      ? cleanTag(doc.slug.replace(/^\d+-/, ""))
      : "";

    const newTags = slugTag && !aiTags.includes(slugTag)
      ? [slugTag, ...aiTags]
      : aiTags;

    // Merge with existing tags — never discard what's already there
    const existing = Array.isArray(doc.tags) ? doc.tags : [];
    const merged = Array.from(new Set([...existing, ...newTags]));

    return merged;
  }
}

// ── GET: list TopicPages ─────────────────────────────────────────────────────
export async function GET(req) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongoDB();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "30", 10));
  const filter = searchParams.get("filter") || "all"; // "all" | "empty"
  const q = searchParams.get("q") || "";

  const match = {};
  if (filter === "empty") {
    match.$or = [{ tags: { $exists: false } }, { tags: { $size: 0 } }];
  }
  if (q) {
    match.$or = [
      ...(match.$or || []),
      { "title.default": { $regex: q, $options: "i" } },
      { "title.english": { $regex: q, $options: "i" } },
      { "title.romaji": { $regex: q, $options: "i" } },
      { "title.original": { $regex: q, $options: "i" } },
      { slug: { $regex: q, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    TopicPage.find(match)
      .select("_id type slug title tags cover description details")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TopicPage.countDocuments(match),
  ]);

  return NextResponse.json({ docs, total, page, limit });
}

// ── POST: generate tags for one page (preview only — no DB write) ────────────
export async function POST(req) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongoDB();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Include existing tags in the doc so generateTagsForDoc can merge them
  const doc = await TopicPage.findById(id)
    .select("type slug title description details tags")
    .lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const tags = await generateTagsForDoc(doc);
    return NextResponse.json({ id, tags });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: save tags to a TopicPage ─────────────────────────────────────────
export async function PATCH(req) {
  if (!(await requireAdmin(req)))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongoDB();
  const { id, tags } = await req.json();
  if (!id || !Array.isArray(tags))
    return NextResponse.json({ error: "Missing id or tags" }, { status: 400 });

  const cleaned = tags
    .map((t) =>
      String(t)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s-]+/g, "-")
        .replace(/(^-|-$)/g, "")
    )
    .filter((t) => t.length > 0);

  await TopicPage.updateOne(
    { _id: id },
    { $addToSet: { tags: { $each: cleaned } } }
  );
  // Return the full updated tags array
  const updated = await TopicPage.findById(id).select("tags").lean();
  return NextResponse.json({ id, tags: updated.tags });
}
