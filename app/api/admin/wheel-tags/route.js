/**
 * Admin API for Wheel tag management.
 * All operations are scoped to wheels created by SYSTEM_USER_ID.
 *
 * GET  /api/admin/wheel-tags?page=1&limit=30&filter=all|sparse&q=search
 *   Returns paginated system wheels with their current tags.
 *
 * POST /api/admin/wheel-tags  { id }
 *   Generates AI tags for a single wheel (preview only — no DB write).
 *   Returns { id, tags }
 *
 * PATCH /api/admin/wheel-tags  { id, tags }
 *   Full-replaces the tags array on the wheel (cleans to kebab-case).
 *   Uses $set so old malformed tags are overwritten.
 *
 * POST /api/admin/wheel-tags/batch
 *   Streaming batch endpoint — see batch/route.js
 *
 * Future: link wheel tags to their parent TopicPage tags via relatedTo.id
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import OpenAI from "openai";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return !!(session && session.user.email === ADMIN_EMAIL);
}

// Tag cleaner — enforces lowercase kebab-case
const cleanTag = (t) =>
  String(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ── AI prompt builder ────────────────────────────────────────────────────────
function buildPrompt(wheel) {
  const desc = wheel.description
    ? wheel.description.slice(0, 500).replace(/\n+/g, " ")
    : "";

  return `
You are a tagging assistant for a spin-wheel content discovery platform.
Generate exactly 5 tags for the following wheel:

Title: ${wheel.title}
${desc ? `Description: ${desc}` : ""}

Rules:
- Tags must be lowercase kebab-case strings (e.g. "trivia", "classroom-activity", "team-building", "icebreaker")
- Describe the use-case, audience, activity type, topic, or theme of the wheel
- Do NOT include tags like "wheel", "spin", "random", "list" — those are obvious
- Be specific: prefer "classroom-activity" over just "activity"
- Return ONLY a valid JSON array of exactly 5 strings. No explanation, no markdown.

Example: ["trivia", "pop-culture", "team-building", "icebreaker", "classroom-activity"]
`.trim();
}

async function generateTagsForWheel(wheel) {
  const prompt = buildPrompt(wheel);
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
    const aiTags = JSON.parse(match[0])
      .map(cleanTag)
      .filter((t) => t.length > 0)
      .slice(0, 5);

    // NOTE: We intentionally do NOT merge with existing tags here because
    // existing tags are often malformed (e.g. "classroomactivities").
    // Fresh AI tags replace them. Manual tags can always be added in the UI.
    //
    // TODO (Future): if wheel.relatedTo.type & relatedTo.id are set,
    // fetch the matching TopicPage and prepend its tags so this wheel
    // surfaces alongside its parent topic in tag-overlap queries.

    return aiTags;
  }
}

// ── GET: paginated list of system wheels ─────────────────────────────────────
export async function GET(req) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongoDB();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") || "30", 10));
  const filter = searchParams.get("filter") || "all"; // "all" | "sparse"
  const q = searchParams.get("q") || "";

  const systemUserId = process.env.SYSTEM_USER_ID;
  const match = { createdBy: systemUserId };

  if (filter === "sparse") {
    match.$or = [
      { tags: { $exists: false } },
      { $expr: { $lt: [{ $size: { $ifNull: ["$tags", []] } }, 4] } },
    ];
  }
  if (q) {
    const re = { $regex: q, $options: "i" };
    const qClauses = [{ title: re }];
    if (match.$or) {
      // Combine: must match system user AND (sparse condition OR search)
      match.$and = [{ $or: match.$or }, { $or: qClauses }];
      delete match.$or;
    } else {
      match.$or = qClauses;
    }
  }

  const [docs, total] = await Promise.all([
    Wheel.find(match)
      .select("_id title description tags wheelPreview relatedTo createdAt data wheelData")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Wheel.countDocuments(match),
  ]);

  return NextResponse.json({ docs, total, page, limit });
}

// ── POST: generate AI tags for one wheel (preview — no DB write) ─────────────
export async function POST(req) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongoDB();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const wheel = await Wheel.findById(id)
    .select("title description tags relatedTo")
    .lean();
  if (!wheel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const tags = await generateTagsForWheel(wheel);
    return NextResponse.json({ id, tags });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: full-replace tags on a wheel ─────────────────────────────────────
export async function PATCH(req) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectMongoDB();
  const { id, tags } = await req.json();
  if (!id || !Array.isArray(tags))
    return NextResponse.json({ error: "Missing id or tags" }, { status: 400 });

  // Clean all tags to kebab-case and deduplicate
  const cleaned = [...new Set(tags.map(cleanTag).filter((t) => t.length > 0))];

  // $set replaces entirely — this fixes any old malformed tags
  await Wheel.updateOne({ _id: id }, { $set: { tags: cleaned } });
  const updated = await Wheel.findById(id).select("tags").lean();
  return NextResponse.json({ id, tags: updated.tags });
}
