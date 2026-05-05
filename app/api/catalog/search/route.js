import { NextResponse } from "next/server";
import { connectMongoDB } from "@lib/mongodb";
import CatalogItem from "@models/catalogItem";

/**
 * GET /api/catalog/search?type=movie&q=inception&limit=6
 *
 * Unified catalog search. Checks Mongo cache first; falls back to TMDB
 * (movies/tv) or AniList (anime). Persists fresh results so the cache
 * warms over time and becomes a proprietary dataset.
 *
 * Supported types: movie | tv | anime
 */

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w185";
const TMDB_SEARCH_BASE = "https://api.themoviedb.org/3/search";

function toSlug(str = "") {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCatalogDoc(doc) {
  return {
    externalId: doc.externalId,
    type: doc.type,
    title: doc.title,
    year: doc.year || null,
    posterUrl: doc.posterUrl || null,
    canonicalSlug: doc.canonicalSlug || null,
    genres: doc.genres || [],
    rating: doc.rating || null,
  };
}

async function searchTMDB(q, mediaType, limit) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];

  const url = new URL(`${TMDB_SEARCH_BASE}/${mediaType}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("query", q);
  url.searchParams.set("page", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || [])
    .filter((r) => r.poster_path)
    .slice(0, limit)
    .map((r) => {
      const title = r.title || r.name || "";
      const releaseDate = r.release_date || r.first_air_date || "";
      return {
        externalId: `tmdb:${r.id}`,
        type: mediaType === "movie" ? "movie" : "tv",
        title,
        year: releaseDate ? new Date(releaseDate).getFullYear() : null,
        posterUrl: `${TMDB_IMAGE_BASE}${r.poster_path}`,
        canonicalSlug: toSlug(title),
        genres: [],
        rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
        fetchedAt: new Date(),
      };
    });
}

async function searchAniList(q, limit) {
  const gql = `
    query($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english }
          coverImage { medium }
          startDate { year }
          genres
          averageScore
        }
      }
    }
  `;

  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: gql, variables: { search: q, perPage: limit } }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.data?.Page?.media || [])
    .filter((m) => m.coverImage?.medium)
    .map((m) => {
      const title = m.title.english || m.title.romaji || "";
      return {
        externalId: `anilist:${m.id}`,
        type: "anime",
        title,
        year: m.startDate?.year || null,
        posterUrl: m.coverImage.medium,
        canonicalSlug: toSlug(title),
        genres: m.genres || [],
        rating: m.averageScore ? Math.round(m.averageScore / 10) : null,
        fetchedAt: new Date(),
      };
    });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "movie"; // movie | tv | anime
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 10);

  if (!["movie", "tv", "anime"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  await connectMongoDB();

  // 1. Check warm cache with text search
  const cached = await CatalogItem.find({
    type,
    $text: { $search: q },
  })
    .limit(limit)
    .lean();

  if (cached.length >= limit) {
    return NextResponse.json({ results: cached.map(normalizeCatalogDoc) });
  }

  // 2. Partial match fallback (case-insensitive) if text index misses
  const partialCached = cached.length === 0
    ? await CatalogItem.find({
        type,
        title: { $regex: q, $options: "i" },
      })
        .limit(limit)
        .lean()
    : [];

  if (partialCached.length >= limit) {
    return NextResponse.json({ results: partialCached.map(normalizeCatalogDoc) });
  }

  // 3. Upstream fetch
  let fresh = [];
  try {
    if (type === "anime") {
      fresh = await searchAniList(q, limit);
    } else {
      fresh = await searchTMDB(q, type, limit);
    }
  } catch {
    // Upstream failure — return whatever cache we have
    const fallback = cached.length ? cached : partialCached;
    return NextResponse.json({ results: fallback.map(normalizeCatalogDoc) });
  }

  // 4. Persist fresh results (write-through cache, $setOnInsert for first write)
  if (fresh.length > 0) {
    await CatalogItem.bulkWrite(
      fresh.map((item) => ({
        updateOne: {
          filter: { externalId: item.externalId },
          update: { $set: item },
          upsert: true,
        },
      }))
    );
  }

  return NextResponse.json({ results: fresh.map(normalizeCatalogDoc) });
}
