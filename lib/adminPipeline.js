import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import OpenAI from "openai";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import { slugify, normalizeTag } from "@lib/slug";
import { createImmutableGlobalSlug, getListUrl } from "@utils/UrlHandler";
import UnifiedList from "@models/unifiedlist";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TMDB_KEY = process.env.TMDB_API_KEY;
const DATA_FILE = resolve(process.cwd(), "data/high-quality-tmdb-lists.json");

function normalizeTags(tags) {
  if (!tags) return ["ai-curated", "movies", "tmdb-verified"];
  if (Array.isArray(tags)) return tags.map((t) => normalizeTag(t)).filter(Boolean);
  return String(tags)
    .split(",")
    .map((t) => normalizeTag(t))
    .filter(Boolean);
}

function stripCodeFences(text) {
  return text.replace(/```json\s*/gi, "").replace(/```\s*$/gi, "").trim();
}

async function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stage 2: Ask an LLM to curate movie candidates matching the list theme.
 * Returns an array of { title, year? } objects.
 */
export async function curateMovies({ title, description, context }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const prompt = `You are a movie curator. Given a list theme, suggest ${
    context ? "8-12" : "10-15"
  } movies that fit it perfectly.

List title: ${title}
Description: ${description || "N/A"}
${context ? `Creative constraint: ${context}` : ""}

Return ONLY a JSON array in this exact format (no markdown, no explanation):
[
  { "title": "Movie Title", "year": 2020 },
  ...
]
Use the original theatrical release year. If a year is unknown, omit the field.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.75,
    max_tokens: 1500,
  });

  const content = stripCodeFences(response.choices[0]?.message?.content || "");
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract the first JSON array from the response.
    const match = content.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (err) {
        throw new Error(`Could not parse curated list JSON: ${err.message}`);
      }
    } else {
      throw new Error("Curator did not return a valid JSON array.");
    }
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Curator response was not a JSON array.");
  }

  return parsed
    .filter((c) => c && typeof c.title === "string" && c.title.trim())
    .map((c) => ({
      title: c.title.trim(),
      year: typeof c.year === "number" ? c.year : undefined,
    }));
}

/**
 * Stage 3: Verify each candidate against TMDB and enrich with metadata.
 */
export async function verifyMovies(candidates) {
  if (!TMDB_KEY) {
    throw new Error("Missing TMDB_API_KEY environment variable.");
  }
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  const verified = [];

  for (const candidate of candidates) {
    try {
      const url = new URL("https://api.themoviedb.org/3/search/movie");
      url.searchParams.set("api_key", TMDB_KEY);
      url.searchParams.set("language", "en-US");
      url.searchParams.set("query", candidate.title);
      url.searchParams.set("page", "1");
      if (candidate.year) url.searchParams.set("year", String(candidate.year));

      const searchRes = await fetchWithTimeout(url.toString());
      if (!searchRes.ok) continue;
      const searchData = await searchRes.json();
      if (!searchData.results || searchData.results.length === 0) continue;

      const matches = candidate.year
        ? searchData.results.filter((r) => {
            if (!r.release_date) return false;
            const y = new Date(r.release_date).getFullYear();
            return Math.abs(y - candidate.year) <= 1;
          })
        : searchData.results;

      const best =
        matches.length > 0
          ? matches.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0]
          : searchData.results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];

      if (!best) continue;

      const detailRes = await fetchWithTimeout(
        `https://api.themoviedb.org/3/movie/${best.id}?api_key=${TMDB_KEY}&language=en-US&append_to_response=credits`
      );
      if (!detailRes.ok) continue;
      const detail = await detailRes.json();

      const director =
        detail.credits?.crew?.find((p) => p.job === "Director")?.name || "";

      // TMDB rates 0-10; normalize to a 0-5 scale for app consistency.
      const normalizedVoteAverage = detail.vote_average ? detail.vote_average / 2 : 0;

      verified.push({
        tmdbId: detail.id,
        title: detail.title,
        originalTitle: detail.original_title,
        year: detail.release_date
          ? new Date(detail.release_date).getFullYear()
          : candidate.year || null,
        releaseDate: detail.release_date || null,
        overview: detail.overview || "",
        posterUrl: detail.poster_path
          ? `https://image.tmdb.org/t/p/w500${detail.poster_path}`
          : null,
        backdropUrl: detail.backdrop_path
          ? `https://image.tmdb.org/t/p/w780${detail.backdrop_path}`
          : null,
        popularity: detail.popularity || 0,
        voteAverage: normalizedVoteAverage,
        director,
        slug: `${detail.id}-${slugify(detail.title)}`,
      });
    } catch (err) {
      console.warn(`Verification failed for "${candidate.title}":`, err.message);
    }
  }

  return verified;
}

async function uniqueNameForUser(baseName, userId) {
  await connectMongoDB();
  let candidate = baseName.slice(0, 100);
  if (!(await UnifiedList.exists({ userId, name: candidate, isDeleted: { $ne: true } }))) {
    return candidate;
  }

  let n = 2;
  while (true) {
    const suffix = ` (${n})`;
    candidate = baseName.slice(0, 100 - suffix.length) + suffix;
    if (!(await UnifiedList.exists({ userId, name: candidate, isDeleted: { $ne: true } }))) {
      return candidate;
    }
    n++;
    if (n > 100) throw new Error("Unable to generate a unique list name.");
  }
}

function readJsonData() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { lists: [] };
  }
}

function writeJsonData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + "\n");
}

/**
 * Stage 4: Persist the verified list as a UnifiedList and update the legacy
 * JSON catalog. Returns a frontend-friendly list object including id, slug,
 * and canonical URL.
 */
export async function savePipelineList({ title, description = "", tags, items, userId }) {
  if (!userId) throw new Error("userId is required to save a list.");
  if (!Array.isArray(items) || items.length === 0) throw new Error("At least one item is required.");

  await connectMongoDB();

  const listTags = normalizeTags(tags);
  const finalName = await uniqueNameForUser(title, userId);

  const idForSlug = new mongoose.Types.ObjectId().toString();
  const slug = await createImmutableGlobalSlug({ title: finalName, id: idForSlug });

  const listItems = items.map((m) => ({
    type: "entity",
    entityType: "movie",
    entityId: m.tmdbId,
    name: m.title,
    slug: m.slug || `${m.tmdbId}-${slugify(m.title)}`,
    image: m.posterUrl || null,
  }));

  const newList = await UnifiedList.create({
    _id: idForSlug,
    userId,
    name: finalName,
    description: description.slice(0, 300),
    tags: listTags,
    items: listItems,
    isPublic: true,
    indexed: true,
    slug,
  });

  // Keep the legacy JSON catalog in sync so existing admin tools still work.
  try {
    const data = readJsonData();
    data.lists.push({
      name: finalName,
      description: newList.description,
      itemCount: listItems.length,
      items,
      tags: listTags,
      source: "ai-curated",
      createdAt: new Date().toISOString(),
    });
    writeJsonData(data);
  } catch (err) {
    console.error("Failed to update legacy JSON catalog:", err.message);
  }

  return {
    id: newList._id.toString(),
    name: newList.name,
    description: newList.description,
    slug: newList.slug,
    url: getListUrl(newList),
    itemCount: listItems.length,
    items: items.map((m) => ({
      ...m,
      itemSlug: m.slug,
    })),
    tags: listTags,
  };
}
