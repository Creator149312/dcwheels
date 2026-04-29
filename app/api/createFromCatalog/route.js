import { NextResponse } from "next/server";
import { sessionData, sessionUserId } from "@utils/SessionData";
import { callOpenAI } from "@components/actions/actions";

// ---------------------------------------------------------------------------
// /api/createFromCatalog
//
// Takes a list of pre-curated segments (from TMDB/RAWG/AniList) plus a wheel
// title, and returns the full page JSON needed by /api/createFromJSON.
//
// Crucially: the AI is called ONLY for the description + 2-3 content
// paragraphs. It is NEVER asked to generate segments — those come pre-shaped
// from the source API with real IDs, slugs, and posters. This is the main
// reason the catalog flow is ~3x faster than /api/createFromPrompt.
// ---------------------------------------------------------------------------

const BANNED = ["nsfw", "porn", "hentai", "nude", "drugs", "weapon"];

const hasBanned = (s = "") => {
  const lc = String(s).toLowerCase();
  return BANNED.some((w) => lc.includes(w));
};

const cleanTag = (t) =>
  String(t || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .trim()
    .toLowerCase();

export async function POST(req) {
  try {
    const session = await sessionData();
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const userId = await sessionUserId();

    const {
      title,
      segments,
      entityType = "movie", // movie | game | anime | character
      skipDescriptionAI = false,
    } = (await req.json()) || {};

    if (typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ message: "Missing title" }, { status: 400 });
    }
    if (!Array.isArray(segments) || !segments.length) {
      return NextResponse.json(
        { message: "Segments must be a non-empty array" },
        { status: 400 }
      );
    }
    if (segments.length > 60) {
      return NextResponse.json(
        { message: "Too many segments (max 60)" },
        { status: 400 }
      );
    }
    if (hasBanned(title)) {
      return NextResponse.json(
        { message: "Title contains banned terms" },
        { status: 400 }
      );
    }

    // Trust the server-side TMDB/RAWG/AniList shape — but still strip any
    // client-added fields we don't want in the DB and clamp text length.
    const cleanSegments = segments
      .filter((s) => s && typeof s.text === "string" && s.text.trim())
      .map((s) => {
        const out = {
          text: String(s.text).slice(0, 120),
          image: typeof s.image === "string" ? s.image : null,
          imageLandscape: !!s.imageLandscape,
        };
        if (s.type === "entity" && s.entityId) {
          out.type = "entity";
          // Entity metadata lives in payload only — top-level duplication
          // was dropped to halve storage on entity wheels.
          const eType = String(s.entityType || entityType).slice(0, 20);
          const eId = s.entityId;
          const eSlug = s.slug ? String(s.slug).slice(0, 120) : undefined;
          out.payload = {
            entityType: eType,
            entityId: eId,
            ...(eSlug && { slug: eSlug }),
          };
        }
        return out;
      });

    if (!cleanSegments.length) {
      return NextResponse.json(
        { message: "No valid segments after cleanup" },
        { status: 400 }
      );
    }

    // Default description + content — used when AI is skipped or fails.
    const topSegmentsPreview = cleanSegments
      .slice(0, 6)
      .map((s) => s.text)
      .join(", ");
    let description = `Spin to randomly pick from ${cleanSegments.length} ${entityType}s including ${topSegmentsPreview}.`;
    let content = [
      {
        type: "paragraph",
        text: `${title} helps you decide what to watch next by randomly picking from a curated list of ${cleanSegments.length} ${entityType}s.`,
      },
      {
        type: "paragraph",
        text: `Each spin lands on a real ${entityType} with details, trailer, and streaming info available on its dedicated page — just click the winner to explore.`,
      },
    ];
    let tags = [entityType, "picker", "random"];

    if (!skipDescriptionAI) {
      const instruction = `
You are writing page copy for a spin-wheel picker page.
Output ONLY valid JSON. No prose outside the JSON.

Wheel title: "${title}"
Wheel segments (first 15): ${JSON.stringify(cleanSegments.slice(0, 15).map((s) => s.text))}

Produce:
- "description": 2 friendly sentences describing what the wheel picks from. Max 280 chars.
- "tags": 3-5 short lowercase tags. No spaces. Relevant.
- "content": array of 2 objects, each { "type": "paragraph", "text": "..." }.
              First paragraph: what this wheel is, who it's for.
              Second paragraph: how to use it, what the winner page offers (details, trailer, where to watch).

Format:
{
  "description": "...",
  "tags": ["...","..."],
  "content": [
    { "type": "paragraph", "text": "..." },
    { "type": "paragraph", "text": "..." }
  ]
}
`;
      try {
        const resp = await callOpenAI(
          userId,
          instruction,
          { max_tokens: 400, temperature: 0.6 },
          `catalog:${title}`
        );
        const text = resp.choices?.[0]?.message?.content?.trim() || "";
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.description === "string") {
          description = parsed.description.slice(0, 400);
        }
        if (Array.isArray(parsed?.tags)) {
          const clean = Array.from(
            new Set(
              parsed.tags.map(cleanTag).filter((t) => t && !hasBanned(t))
            )
          ).slice(0, 5);
          if (clean.length) tags = clean;
        }
        if (Array.isArray(parsed?.content) && parsed.content.length) {
          content = parsed.content
            .filter((c) => c && typeof c.text === "string")
            .slice(0, 3)
            .map((c) => ({ type: "paragraph", text: c.text.slice(0, 800) }));
        }
      } catch (err) {
        // AI failure is non-fatal — we already have sensible defaults.
        console.warn("catalog AI description failed:", err?.message);
      }
    }

    // Build the same JSON shape that /api/createFromJSON expects so the
    // frontend can hand this straight to the publish step.
    const jsonData = {
      title: title.trim(),
      description,
      tags,
      content,
      segments: cleanSegments,
    };

    return NextResponse.json({ json: { data: jsonData } }, { status: 200 });
  } catch (err) {
    console.error("createFromCatalog error:", err);
    return NextResponse.json(
      { message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
