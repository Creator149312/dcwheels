/**
 * POST /api/admin/topicpage-tags/batch
 * Body: { ids: string[] }  — if empty, runs on all empty-tag pages
 *
 * Returns a streaming Response of newline-delimited JSON events:
 *   { type: "progress", id, title, tags, done, total }
 *   { type: "error",    id, title, error }
 *   { type: "complete", succeeded, failed, total }
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";
import OpenAI from "openai";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
- NO tags like "anime", "movie", "game", "character"
- Be specific: prefer "psychological-thriller" over "thriller"
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
      if (attempt === 2) throw new Error(`No JSON array in response`);
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

    // Slug-derived tag: "1539104-kaisen-execution" → "kaisen-execution"
    // Gives a unique fingerprint tag for cross-collection discovery.
    const slugTag = doc.slug
      ? cleanTag(doc.slug.replace(/^\d+-/, ""))
      : "";

    const newTags = slugTag && !aiTags.includes(slugTag)
      ? [slugTag, ...aiTags]
      : aiTags;

    // Merge with existing tags — never discard what’s already there
    const existing = Array.isArray(doc.tags) ? doc.tags : [];
    const merged = Array.from(new Set([...existing, ...newTags]));

    return merged;
  }
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  await connectMongoDB();
  const { ids, limit = 0, offset = 0 } = await req.json();

  // If ids provided, use them directly.
  // Otherwise fetch empty-tag pages with optional limit/offset for batched runs.
  let docs;
  if (Array.isArray(ids) && ids.length > 0) {
    docs = await TopicPage.find({ _id: { $in: ids } })
      .select("_id type slug title description details tags")
      .lean();
  } else {
    const sparseFilter = {
      $or: [
        { tags: { $exists: false } },
        { $expr: { $lt: [{ $size: { $ifNull: ["$tags", []] } }, 4] } },
      ],
    };
    const q = TopicPage.find(sparseFilter)
      .select("_id type slug title description details tags")
      .sort({ createdAt: 1 })
      .skip(offset);
    if (limit > 0) q.limit(limit);
    docs = await q.lean();
  }

  // Also expose total remaining so the UI can paginate
  const totalRemaining = await TopicPage.countDocuments({
    $or: [
      { tags: { $exists: false } },
      { $expr: { $lt: [{ $size: { $ifNull: ["$tags", []] } }, 4] } },
    ],
  });

  const total = docs.length;
  let done = 0;
  let succeeded = 0;
  let failed = 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      };

      for (const doc of docs) {
        const title = getTitle(doc);
        try {
          const tags = await generateTagsForDoc(doc);
          await TopicPage.updateOne(
            { _id: doc._id },
            { $addToSet: { tags: { $each: tags } } }
          );
          done++;
          succeeded++;
          send({ type: "progress", id: String(doc._id), title, tags, done, total });
        } catch (err) {
          done++;
          failed++;
          send({ type: "error", id: String(doc._id), title, error: err.message, done, total });
        }
        // Small yield between requests to respect rate limits
        await new Promise((r) => setTimeout(r, 300));
      }

      send({ type: "complete", succeeded, failed, total, totalRemaining: totalRemaining - succeeded });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
