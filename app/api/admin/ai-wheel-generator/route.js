/**
 * AI-Powered Wheel Generator API
 *
 * POST /api/admin/ai-wheel-generator
 *   Generates wheel segments, description, and weights based on title.
 *   Body: { title, theme? }
 *   Returns: { segments: [{ text, weight }], description, suggestedTags }
 *
 * GET /api/admin/ai-wheel-generator
 *   Returns popular tags from existing wheels for picker.
 *
 * POST /api/admin/ai-wheel-generator/create
 *   Creates the final wheel and page document (see create/route.js).
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import Wheel from "@models/wheel";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { isValid: false, session: null };
  }
  return { isValid: true, session };
}

function cleanTag(t) {
  return String(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Generation endpoint - POST
export async function POST(request) {
  const { isValid } = await requireAuth();
  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, theme = "general" } = await request.json();

    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // AI call to generate segments
    const segmentsPrompt = `You are an expert at creating entertaining and engaging wheel game segments for a "${title}" themed wheel.

Generate exactly 8 creative, varied, and interesting options/segments for this wheel. Each segment should be:
- Engaging and entertaining
- Relevant to the theme: "${title}"
- Distinct from the others
- Suitable for a spinning wheel game

Also assign a relevance weight (1-10) to each segment based on:
- How trending/popular this option is
- How likely people would want to spin for this
- Cultural relevance and interest level

Return ONLY valid JSON array in this exact format, no markdown, no code blocks:
[
  { "text": "option 1", "weight": 8 },
  { "text": "option 2", "weight": 7 }
]`;

    const segResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: segmentsPrompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    let segments = [];
    try {
      const segmentText = segResponse.choices[0].message.content.trim();
      segments = JSON.parse(segmentText);
      // Validate segment structure
      if (!Array.isArray(segments) || segments.length === 0) {
        throw new Error("Invalid segments format");
      }
      // Ensure all segments have text and weight
      segments = segments.slice(0, 12).map((seg) => ({
        text: String(seg.text || seg.option || ""),
        weight: Math.max(1, Math.min(10, parseInt(seg.weight) || 5)),
      }));
    } catch (e) {
      console.error("Failed to parse segments:", e);
      return NextResponse.json(
        { error: "Failed to generate segments" },
        { status: 500 }
      );
    }

    // AI call to generate description (structured: short summary + content paragraphs)
    const descPrompt = `Write content for a spinning wheel game about "${title}".

Return ONLY valid JSON in this exact format, no markdown, no code blocks:
{
  "shortDescription": "A single engaging sentence (max 120 characters) summarising what this wheel is about.",
  "contentParagraphs": [
    "First paragraph (~80 words). Introduce the wheel theme and why it is fun.",
    "Second paragraph (~80 words). Describe who will enjoy it and some example use-cases.",
    "Third paragraph (~80 words). Invite the user to spin and explain what to expect."
  ]
}`;

    const descResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: descPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    let shortDescription = "";
    let contentParagraphs = [];
    try {
      const descParsed = JSON.parse(descResponse.choices[0].message.content.trim());
      shortDescription = String(descParsed.shortDescription || "").slice(0, 160);
      contentParagraphs = Array.isArray(descParsed.contentParagraphs)
        ? descParsed.contentParagraphs.map(String).filter(Boolean)
        : [];
    } catch (e) {
      // Fallback: use raw text as a single paragraph
      const raw = descResponse.choices[0].message.content.trim();
      shortDescription = raw.split(".")[0].slice(0, 160);
      contentParagraphs = [raw];
    }

    // AI call to suggest tags
    const tagsPrompt = `For a "${title}" themed spinning wheel, suggest 5-7 relevant tags that categorize this content.
Return ONLY comma-separated tags, no numbers, no markdown. Example format: "anime,gaming,entertainment,quiz"`;

    const tagsResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: tagsPrompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 100,
    });

    const suggestedTagsText = tagsResponse.choices[0].message.content.trim();
    const suggestedTags = suggestedTagsText
      .split(",")
      .map((t) => cleanTag(t))
      .filter(Boolean);

    return NextResponse.json(
      {
        segments,
        shortDescription,
        contentParagraphs,
        suggestedTags,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate wheel content" },
      { status: 500 }
    );
  }
}

// Get available tags - GET
export async function GET(request) {
  await connectMongoDB();

  try {
    // Get popular tags from existing wheels
    const popularTags = await Wheel.aggregate([
      { $match: { tags: { $exists: true, $ne: [] } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { tag: "$_id", count: 1, _id: 0 } },
    ]);

    const tags = popularTags.map((t) => ({
      name: t.tag,
      count: t.count,
    }));

    return NextResponse.json({ tags }, { status: 200 });
  } catch (error) {
    console.error("Tags fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
