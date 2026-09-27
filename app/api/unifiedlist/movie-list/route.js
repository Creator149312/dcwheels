// app/api/unifiedlist/movie-list/route.js
// Separate, isolated endpoint for generating a movie list from a free-text prompt.
// AI interprets the prompt (title, description, movie picks); each pick is resolved
// to a real TMDB movie via /search/movie so every item carries a genuine TMDB id.
// Does NOT modify the generic POST /api/unifiedlist behavior.

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import { sessionUserId } from "@utils/SessionData";
import { createImmutableGlobalSlug, getListUrl } from "@utils/UrlHandler";
import { fetchWithTimeout } from "@lib/topicPage";
import { slugify } from "@lib/slug";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_MOVIES = 50;
const MIN_MOVIES = 7;
const TMDB_POSTER = "https://image.tmdb.org/t/p/w342";

/**
 * Trim text to the last complete sentence within the limit.
 * Avoids mid-word / mid-sentence cutoffs in generated content.
 */
function trimAtSentenceBoundary(text, maxChars) {
  if (!text || text.length <= maxChars) return text;
  const window = text.slice(0, maxChars);
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
  const lastSpace = window.lastIndexOf(" ");
  return (lastSpace > 0 ? window.slice(0, lastSpace) : window).trim();
}

// Rotating description styles so generated text doesn't read the same.
const DESCRIPTION_STYLES = [
  { key: "debate", instruction: (t) => `Open with a bold hot take about the movies in "${t}" that fans love to argue about.` },
  { key: "nostalgia", instruction: (t) => `Open with a nostalgic or emotional angle — why the films in "${t}" stick with people.` },
  { key: "challenge", instruction: (t) => `Open with a direct challenge to the reader ("How many of these have you actually seen?").` },
  { key: "guide", instruction: (t) => `Open with a helpful, guide-like tone — for newcomers wondering where to start with "${t}".` },
  { key: "community", instruction: (t) => `Open with the community angle — movie nights, debates, rewatch value around "${t}".` },
];

/**
 * Extract a JSON payload from a model response. GPT-5 sometimes wraps output
 * in ```json fences despite instructions — strip them before parsing.
 */
function extractJson(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
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
 * Ask AI to interpret the user prompt and return:
 * { listTitle, description, movies: [{ title, year }] }
 */
async function generateMoviePlan(userPrompt) {
  const style = DESCRIPTION_STYLES[Math.floor(Math.random() * DESCRIPTION_STYLES.length)];

  const prompt = `A user wants a movie list based on this request: "${userPrompt}"

Return ONLY valid JSON in this exact format, no markdown, no code blocks:
{
  "listTitle": "A catchy, SEO-friendly list title (max 70 characters) that captures the request",
  "description": "A natural, fan-written description of 120-150 words in 2 short paragraphs. ${style.instruction(userPrompt)} Sound like a genuine movie fan. BANNED phrases: curated collection, comprehensive list, delve into, embark on a journey, you'll love this, dives deep. Do NOT start with 'If you'. End with a complete sentence.",
  "movies": [
    { "title": "Exact official movie title", "year": 1999 }
  ]
}

Movie selection rules:
- Include at least ${MIN_MOVIES} and up to 40 REAL, well-known movies that genuinely fit the request
- If the request is narrow (e.g. a specific franchise), include every matching movie even if that's only 7-15
- If the request is broad, aim for 30-40
- Use exact official titles as they appear on TMDB (critical for search matching)
- Include the release year to disambiguate remakes
- Order from most essential to least
- Mix popular picks with a few underrated gems
- Only include movies you are confident actually exist`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85,
    max_tokens: 1500,
  });

  const raw = res.choices?.[0]?.message?.content?.trim() || "";
  if (!raw) {
    console.error("Movie plan: empty completion", JSON.stringify({
      finishReason: res.choices?.[0]?.finish_reason,
      usage: res.usage,
    }));
    throw new Error("AI returned an empty response");
  }

  const parsed = extractJson(raw);
  if (!parsed) {
    console.error("Movie plan: unparseable response", raw.slice(0, 200));
    throw new Error("AI returned invalid JSON");
  }

  if (!parsed.listTitle || !Array.isArray(parsed.movies) || parsed.movies.length === 0) {
    throw new Error("AI returned an invalid movie plan");
  }

  return {
    listTitle: String(parsed.listTitle).slice(0, 100),
    description: trimAtSentenceBoundary(String(parsed.description || ""), 1000),
    movies: parsed.movies.slice(0, MAX_MOVIES),
  };
}

/**
 * Resolve one movie title (+year hint) to a TMDB movie via /search/movie.
 * Returns the best match with poster, or null when nothing usable is found.
 */
async function resolveMovieOnTMDB(title, year) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey || !title) return null;

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("query", title);
  if (year && !Number.isNaN(Number(year))) {
    url.searchParams.set("year", String(year));
  }

  try {
    const res = await fetchWithTimeout(url.toString(), { next: { revalidate: 86400 } }, 8000);
    if (!res.ok) return null;
    const data = await res.json();
    let results = (data.results || []).filter((m) => m.poster_path);
    if (results.length === 0) return null;

    // Prefer exact-ish title match (case-insensitive), else first result
    const needle = title.toLowerCase().trim();
    const exact = results.find((m) => (m.title || "").toLowerCase().trim() === needle);
    return exact || results[0];
  } catch {
    return null;
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
      prompt: userPrompt,
      isPublic = true,
      listName, // optional custom title override
    } = body;

    if (!userPrompt || typeof userPrompt !== "string" || userPrompt.trim().length < 5) {
      return NextResponse.json(
        { error: "Prompt is required (at least 5 characters)" },
        { status: 400 }
      );
    }

    if (!process.env.TMDB_API_KEY) {
      return NextResponse.json({ error: "TMDB API is not configured" }, { status: 500 });
    }

    // ✅ 1. AI interprets the prompt → title, description, movie picks
    let plan;
    try {
      plan = await generateMoviePlan(userPrompt.trim());
    } catch (e) {
      console.error("Movie plan generation failed:", e.message);
      return NextResponse.json(
        { error: "Could not interpret the prompt. Try rephrasing it." },
        { status: 422 }
      );
    }

    const baseName = typeof listName === "string" && listName.trim()
      ? listName.trim().slice(0, 100)
      : plan.listTitle;

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

    // ✅ 2. Resolve each AI pick against TMDB (parallel, tolerant of failures)
    const resolved = await Promise.all(
      plan.movies.map((m) => resolveMovieOnTMDB(m.title, m.year))
    );

    // ✅ 3. Deduplicate by TMDB id and build entity items
    const seenIds = new Set();
    const items = [];
    for (const movie of resolved) {
      if (!movie) continue;
      const id = String(movie.id || "").trim();
      if (!id || seenIds.has(id)) continue;
      seenIds.add(id);

      const title = movie.title || "Untitled";
      items.push({
        type: "entity",
        entityType: "movie",
        entityId: id,
        name: title,
        slug: `${id}-${slugify(title)}`,
        image: movie.poster_path ? `${TMDB_POSTER}${movie.poster_path}` : null,
        addedAt: new Date(),
        rank: items.length + 1,
      });
    }

    if (items.length < MIN_MOVIES) {
      return NextResponse.json(
        { error: `Only ${items.length} movie${items.length === 1 ? "" : "s"} could be matched on TMDB (need at least ${MIN_MOVIES}). Try a broader prompt.` },
        { status: 404 }
      );
    }

    const fallbackDescription = `Movie list: ${baseName}.`;
    const description = (plan.description || fallbackDescription).slice(0, 1000);

    // ✅ 4. Create the list (Standard format; Tier Board toggle stays available)
    const idForSlug = new mongoose.Types.ObjectId().toString();
    const slug = await createImmutableGlobalSlug({ title: baseName, id: idForSlug });

    const newList = await UnifiedList.create({
      _id: idForSlug,
      userId,
      name: baseName,
      description,
      tags: ["movies", slugify(baseName)].filter(Boolean),
      items,
      isPublic: typeof isPublic === "boolean" ? isPublic : true,
      slug,
      format: "standard",
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
    console.error("POST /api/unifiedlist/movie-list error:", err);
    return NextResponse.json(
      { error: "Failed to create movie list", details: err.message },
      { status: 500 }
    );
  }
}
