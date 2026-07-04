import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Memory files live in the (content)/_shared/post-generation/ folder
const MEMORY_DIR = path.join(process.cwd(), "app/(content)/_shared/post-generation");

function loadMemory(type) {
  const filePath = path.join(MEMORY_DIR, `${type}.md`);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

/**
 * POST /api/admin/post-generator/generate
 *
 * Generates posts for a given TopicPage using a two-step AI pipeline.
 * Does NOT save to the database — returns drafts for admin review.
 *
 * Body: { topic: { relatedId, type, displayTitle, cover, description, tags }, count: number }
 */
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { topic, count } = await req.json();

    if (!topic?.type || !topic?.displayTitle) {
      return NextResponse.json({ message: "Invalid topic payload" }, { status: 400 });
    }

    const safeCount = Math.max(1, Math.min(6, parseInt(count) || 3));
    const memoryContext = loadMemory(topic.type);

    const drafts = [];

    for (let i = 0; i < safeCount; i++) {
      // ── STEP 1: Research – what do fans debate about this? ───────────────
      const researchResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a pop-culture researcher who pinpoints what real fans debate online. Be specific — reference actual characters, arcs, mechanics, or decisions. If you are not certain about a detail, say so rather than inventing facts.",
          },
          {
            role: "user",
            content: `Give me a DIFFERENT, specific fan debate or hot take about the ${topic.type} "${topic.displayTitle}" (debate #${i + 1} of ${safeCount} — make each one distinct). Reference specific plot points, characters, or mechanics only if you are certain they exist. Keep it to 3-4 sentences.`,
          },
        ],
        temperature: 0.75,
      });

      const researchContext = researchResponse.choices[0].message.content;

      // ── STEP 2: Generate post using memory strategy ───────────────────────
      const generateResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a genuine fan posting a discussion on Spinpapa, a community forum.
Output ONLY valid JSON with these exact keys:
{
  "title": "short catchy title under 100 chars",
  "content": "body text under 300 chars",
  "pollOptions": ["option1", "option2"],
  "category": "the category name you chose from the strategy guide"
}

ACCURACY RULES (critical — do not hallucinate):
- Only mention specific character names, episode details, or mechanics you are very sure about.
- If uncertain about a specific detail, phrase it as community opinion: "some fans think..." or "a lot of people feel..."
- Do NOT invent plot points, characters, or abilities that may not exist.`,
          },
          {
            role: "user",
            content: `Write discussion post #${i + 1} about the ${topic.type} "${topic.displayTitle}".

What fans are debating (use this as your foundation):
${researchContext}

Strategy guide for ${topic.type} posts:
---
${memoryContext || "Write an engaging discussion post with a 2-4 option poll."}
---

VOICE RULES:
- Sound like a real, everyday fan — mostly lowercase is fine.
- One natural abbreviation like "tbh" or "kinda" is okay. Avoid heavy slang.
- No hashtags, no emojis, no exclamation spam. Just dive in.
- pollOptions: 2 to 4 short, punchy choices.`,
          },
        ],
        temperature: 0.75,
      });

      const postData = JSON.parse(generateResponse.choices[0].message.content);

      drafts.push({
        draftId: `draft-${Date.now()}-${i}`,
        title: postData.title,
        content: postData.content,
        pollOptions: (postData.pollOptions || []).slice(0, 4).map((text, idx) => ({
          tempId: `opt-${i}-${idx}`,
          text,
        })),
        category: postData.category || "General",
        researchContext, // expose to admin so they can verify AI's reasoning
        // Topic metadata for publishing
        contentRef: {
          type: topic.type,
          externalId: topic.relatedId,
          title: topic.displayTitle,
          image: topic.cover,
        },
        tags: [topic.type, "discussion", (postData.category || "debate").toLowerCase().replace(/\s+/g, "-")],
      });
    }

    return NextResponse.json({ drafts });
  } catch (err) {
    console.error("POST /api/admin/post-generator/generate error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
