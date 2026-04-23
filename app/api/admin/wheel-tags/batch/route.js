/**
 * POST /api/admin/wheel-tags/batch
 * Body: { ids?: string[], limit?: number, offset?: number }
 *
 * If ids provided: process only those wheels.
 * If ids empty: process SYSTEM_USER_ID wheels with < 4 tags (with limit/offset for batching).
 *
 * Streams newline-delimited JSON events:
 *   { type: "progress", id, title, tags, done, total }
 *   { type: "error",    id, title, error, done, total }
 *   { type: "complete", succeeded, failed, total, totalRemaining }
 *
 * Tags are REPLACED (not merged) because existing tags may be malformed.
 *
 * TODO (Future): after generating AI tags, fetch this wheel's parent TopicPage
 * via relatedTo.type + relatedTo.id and prepend its slug-fingerprint tag so
 * the wheel surfaces alongside the topic in tag-overlap discovery queries.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import OpenAI from "openai";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const cleanTag = (t) =>
  String(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/(^-|-$)/g, "");

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
- Do NOT include tags like "wheel", "spin", "random", "list"
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
      if (attempt === 2) throw new Error(`No JSON array in response`);
      continue;
    }
    const aiTags = JSON.parse(match[0])
      .map(cleanTag)
      .filter((t) => t.length > 0)
      .slice(0, 5);
    return aiTags;
  }
}

// Sparse filter: SYSTEM user wheels with fewer than 4 tags
function sparseFilter(systemUserId) {
  return {
    createdBy: systemUserId,
    $or: [
      { tags: { $exists: false } },
      { $expr: { $lt: [{ $size: { $ifNull: ["$tags", []] } }, 4] } },
    ],
  };
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.email !== ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  await connectMongoDB();
  const { ids, limit = 0, offset = 0 } = await req.json();
  const systemUserId = process.env.SYSTEM_USER_ID;

  let docs;
  if (Array.isArray(ids) && ids.length > 0) {
    // Explicit ID list — still scope to system user for safety
    docs = await Wheel.find({ _id: { $in: ids }, createdBy: systemUserId })
      .select("_id title description tags relatedTo")
      .lean();
  } else {
    const q = Wheel.find(sparseFilter(systemUserId))
      .select("_id title description tags relatedTo")
      .sort({ createdAt: 1 })
      .skip(offset);
    if (limit > 0) q.limit(limit);
    docs = await q.lean();
  }

  const totalRemaining = await Wheel.countDocuments(sparseFilter(systemUserId));

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

      for (const wheel of docs) {
        const title = wheel.title || "Untitled";
        try {
          const tags = await generateTagsForWheel(wheel);
          // $set replaces tags entirely — cleans up old malformed tags
          await Wheel.updateOne({ _id: wheel._id }, { $set: { tags } });
          done++;
          succeeded++;
          send({ type: "progress", id: String(wheel._id), title, tags, done, total });
        } catch (err) {
          done++;
          failed++;
          send({ type: "error", id: String(wheel._id), title, error: err.message, done, total });
        }
        // Respect OpenAI rate limits
        await new Promise((r) => setTimeout(r, 300));
      }

      send({
        type: "complete",
        succeeded,
        failed,
        total,
        totalRemaining: Math.max(0, totalRemaining - succeeded),
      });
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
