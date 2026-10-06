import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { connectMongoDB } from "@lib/mongodb";
import TopicPage from "@models/topicpage";
import {
  fetchAnime,
  fetchMovies,
  fetchGames,
  fetchCharacters,
} from "@app/(content)/[type]/TopicPagesHelperFunctions";
import { isCleanText, isTopicDocSafe } from "@/lib/contentSafety";

/**
 * GET /api/search/topics?q=query&type=movie&limit=12
 *
 * Local-first search over cached TopicPage documents. Results are ranked by
 * relevance, cached for a short TTL, and fall back to external APIs only when
 * the local corpus is thin. Failing upstream APIs are temporarily skipped to
 * avoid repeated timeouts.
 */
const FALLBACK_THRESHOLD = 6; // fetch external if local count is below this
const LOCAL_CACHE_TTL = 180; // 3 minutes
const API_FAILURE_COOLDOWN_MS = 60_000; // skip a failing upstream for 60s
const apiFailureCache = new Map(); // type -> timestamp

function recordApiFailure(type) {
  apiFailureCache.set(type, Date.now());
}

function isApiHealthy(type) {
  const lastFailure = apiFailureCache.get(type);
  if (!lastFailure) return true;
  return Date.now() - lastFailure > API_FAILURE_COOLDOWN_MS;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const type = searchParams.get("type");
    const limitParam = searchParams.get("limit");
    const pageParam = searchParams.get("page");

    const limit = Math.min(parseInt(limitParam, 10) || 12, 50);
    const page = Math.max(parseInt(pageParam, 10) || 1, 1);

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: [], meta: { total: 0, page, limit } });
    }

    await connectMongoDB();

    const { results: localResults, total } = await cachedLocalSearch({
      q: q.trim(),
      type,
      page,
      limit,
    });

    let results = localResults;

    // Only fall back to external APIs on the first page and when local corpus
    // is thin. Skip upstreams that recently failed to avoid repeated timeouts.
    if (page === 1 && results.length < FALLBACK_THRESHOLD && isApiHealthy(type)) {
      try {
        const external = await fetchExternalTopics({ q, type, limit });
        const merged = mergeExternalResults(results, external, limit);
        results = merged;
      } catch (err) {
        recordApiFailure(type);
        console.warn("External fallback failed:", err.message);
      }
    }

    return NextResponse.json({
      results,
      meta: {
        total: Math.max(total, results.length),
        page,
        limit,
        hasMore: total > page * limit,
      },
    });
  } catch (err) {
    console.error("Topic search error:", err);
    return NextResponse.json(
      { error: "Search failed", results: [], meta: { total: 0, page: 1, limit: 12 } },
      { status: 500 }
    );
  }
}

const cachedLocalSearch = unstable_cache(
  async ({ q, type, page, limit }) => runLocalSearch({ q, type, page, limit }),
  ["topic-search"],
  { revalidate: LOCAL_CACHE_TTL, tags: ["topic-search"] }
);

async function runLocalSearch({ q, type, page, limit }) {
  const skip = (page - 1) * limit;
  const queryWords = q.split(/\s+/).filter(Boolean);

  // Try Atlas Search first. For multi-word queries we require all words in
  // phrase order so "The Lost City" doesn't match every title with "The".
  let atlasResults = [];
  let atlasTotal = 0;

  try {
    [atlasResults, atlasTotal] = await runAtlasSearch({ q, type, skip, limit });
  } catch (err) {
    console.warn("Atlas Search failed, will fall back to text/regex:", err.message);
  }

  // Fallback: MongoDB $text search for whole-word matches.
  // $text is OR-based by default, so for multi-word queries we wrap the phrase
  // in quotes to require the exact phrase.
  let textResults = [];
  let textTotal = 0;

  try {
    const textMatch = buildTextMatch(q, type, queryWords);
    [textResults, textTotal] = await Promise.all([
      TopicPage.find(textMatch, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .select(
          "type relatedId slug title cover description tags details rating worthIt wheels createdAt"
        )
        .lean(),
      TopicPage.countDocuments(textMatch),
    ]);
  } catch (err) {
    console.warn("$text search failed, will fall back to regex:", err.message);
  }

  // Deduplicate Atlas and text results by _id, preferring Atlas order.
  const seenIds = new Set(atlasResults.map((d) => String(d._id)));
  const merged = [...atlasResults];

  for (const doc of textResults) {
    if (!seenIds.has(String(doc._id))) {
      merged.push(doc);
      seenIds.add(String(doc._id));
    }
  }

  // Final fallback: regex search requiring all query words.
  let regexResults = { results: [], total: 0 };
  if (merged.length < limit) {
    regexResults = await runRegexSearch({ q, type, page, limit, skip, queryWords });
    for (const doc of regexResults.results) {
      if (!seenIds.has(String(doc._id))) {
        merged.push(doc);
        seenIds.add(String(doc._id));
      }
    }
  }

  // Score and sort all candidates, then deduplicate by canonical title.
  // Some legacy imports created multiple TopicPage documents for the same
  // title; keep the highest-scored copy regardless of source.
  const scored = merged
    .map((doc) => ({ doc, score: scoreRelevance(doc, q, queryWords) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.doc.createdAt) - new Date(a.doc.createdAt);
    });

  const seenTitles = new Set();
  const deduped = [];
  for (const item of scored) {
    if (!isTopicDocSafe(item.doc)) continue;
    const title = normalizeTitle(item.doc);
    if (!title || seenTitles.has(title)) continue;
    seenTitles.add(title);
    deduped.push(normalizeTopicPage(item.doc));
    if (deduped.length >= limit) break;
  }

  return {
    results: deduped,
    total: Math.max(atlasTotal, textTotal, regexResults.total),
  };
}

function normalizeTitle(doc) {
  return String(
    doc.title?.default ||
      doc.title?.english ||
      doc.title?.localized ||
      doc.title?.romaji ||
      doc.title?.original ||
      doc.title?.native ||
      doc.slug ||
      ""
  )
    .toLowerCase()
    .trim();
}

async function runAtlasSearch({ q, type, skip, limit }) {
  const words = q.split(/\s+/).filter(Boolean);

  // Build a compound query that requires every word to be present.
  // For single-word queries we use autocomplete; for multi-word we prefer
  // a phrase so "The Lost City" doesn't match every title containing "The".
  const titleSearch =
    words.length > 1
      ? {
          phrase: {
            query: q,
            path: "title.default",
            slop: 2,
          },
        }
      : {
          autocomplete: {
            query: q,
            path: "title.default",
            tokenOrder: "any",
            fuzzy: { maxEdits: 1, prefixLength: 2 },
          },
        };

  const matchStage =
    type && type !== "all"
      ? {
          $search: {
            index: "default",
            compound: {
              must: [titleSearch],
              filter: [{ equals: { path: "type", value: type } }],
            },
          },
        }
      : { $search: { index: "default", ...titleSearch } };

  const [agg] = await TopicPage.aggregate([
    matchStage,
    {
      $facet: {
        results: [
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              type: 1,
              relatedId: 1,
              slug: 1,
              title: 1,
              cover: 1,
              description: 1,
              tags: 1,
              details: 1,
              rating: 1,
              worthIt: 1,
              wheels: 1,
              createdAt: 1,
              score: { $meta: "searchScore" },
            },
          },
        ],
        meta: [{ $count: "total" }],
      },
    },
  ]);

  const results = agg?.results ?? [];
  const total = agg?.meta?.[0]?.total ?? 0;
  return [results, total];
}

function buildTextMatch(q, type, queryWords) {
  // For multi-word queries, $text treats terms as OR by default. Quote the
  // query to require the exact phrase, which dramatically reduces noise for
  // queries like "The Lost City".
  const phrase = queryWords.length > 1 ? `"${q}"` : q;
  const match = { $text: { $search: phrase } };
  if (type && type !== "all") {
    match.type = type;
  }
  return match;
}

async function runRegexSearch({ q, type, limit, skip, queryWords }) {
  const escaped = queryWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // Require ALL query words in every matched field. This prevents "The Lost City"
  // from returning every title containing just "The" or "City".
  const regexAll = new RegExp(
    escaped.map((w) => `(?=.*\\b${w}\\b)`).join("") + ".*",
    "i"
  );

  const baseMatch = {
    $or: [
      { "title.default": { $regex: regexAll } },
      { "title.english": { $regex: regexAll } },
      { "title.romaji": { $regex: regexAll } },
      { "title.localized": { $regex: regexAll } },
      { "title.original": { $regex: regexAll } },
      { slug: { $regex: regexAll } },
      { tags: { $in: [regexAll] } },
    ],
  };

  if (type && type !== "all") {
    baseMatch.type = type;
  }

  // Fetch a slightly larger window so relevance ranking can surface better
  // matches that might live just beyond the current pagination slice.
  const fetchLimit = limit + skip + limit * 2;

  const [rawResults, total] = await Promise.all([
    TopicPage.find(baseMatch)
      .sort({ createdAt: -1 })
      .limit(fetchLimit)
      .select(
        "type relatedId slug title cover description tags details rating worthIt wheels createdAt"
      )
      .lean(),
    TopicPage.countDocuments(baseMatch),
  ]);

  return { results: rawResults, total };
}

function scoreRelevance(doc, rawQuery, words) {
  const title = String(
    doc.title?.default ||
      doc.title?.english ||
      doc.title?.localized ||
      doc.title?.romaji ||
      doc.title?.original ||
      doc.title?.native ||
      ""
  ).toLowerCase();
  const query = rawQuery.toLowerCase();
  let score = 0;

  if (title === query) score += 100;
  else if (title.startsWith(query)) score += 60;
  else if (words.every((w) => title.includes(w.toLowerCase()))) score += 40;
  else if (words.some((w) => title.includes(w.toLowerCase()))) score += 20;

  const slug = String(doc.slug || "").toLowerCase();
  if (slug.includes(query)) score += 15;

  const tags = (doc.tags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => t === query)) score += 25;
  else if (tags.some((t) => words.every((w) => t.includes(w.toLowerCase())))) score += 12;
  else if (tags.some((t) => words.some((w) => t.includes(w.toLowerCase())))) score += 6;

  const desc = String(doc.description || "").toLowerCase();
  if (desc.includes(query)) score += 8;
  else if (words.some((w) => desc.includes(w.toLowerCase()))) score += 3;

  return score;
}

async function fetchExternalTopics({ q, type, limit }) {
  switch (type) {
    case "anime":
      return fetchAnime({ search: q, page: 1, perPage: limit }).then((items) =>
        (items || [])
          .filter((a) => !a.isAdult)
          .map(normalizeExternalAnime)
          .filter(isTopicDocSafe)
      );
    case "movie":
      return fetchMovies({ search: q, page: 1 }).then((items) =>
        (items || [])
          .filter((m) => !m.adult && isCleanText(m.title))
          .map(normalizeExternalMovie)
          .filter(isTopicDocSafe)
      );
    case "game":
      return fetchGames({ search: q, page: 1, page_size: limit }).then((items) =>
        (items || [])
          .filter((g) => {
            const isAdultEsrb = g.esrb_rating?.slug === "adults-only";
            const hasAdultTag = (g.tags || []).some((t) => {
              const name = (t.name || "").toLowerCase();
              return name === "nsfw" || name === "sexual content" || name === "erotic" || name === "hentai";
            });
            return !isAdultEsrb && !hasAdultTag && isCleanText(g.name);
          })
          .map(normalizeExternalGame)
          .filter(isTopicDocSafe)
      );
    case "character":
      return fetchCharacters({ search: q, page: 1, perPage: limit }).then((items) =>
        (items || [])
          .map(normalizeExternalCharacter)
          .filter(isTopicDocSafe)
      );
    default:
      return [];
  }
}

function mergeExternalResults(local, external, limit) {
  const seen = new Set(local.map((r) => String(r.id)));
  const merged = [...local];

  for (const item of external) {
    if (!seen.has(String(item.id))) {
      merged.push(item);
      seen.add(String(item.id));
    }
    if (merged.length >= limit) break;
  }

  return merged;
}

function normalizeTopicPage(doc) {
  const title =
    doc.title?.default ||
    doc.title?.english ||
    doc.title?.localized ||
    doc.title?.romaji ||
    doc.title?.original ||
    doc.title?.native ||
    doc.slug ||
    "Untitled";

  const avgRating =
    doc.rating?.count > 0
      ? (doc.rating.totalScore / doc.rating.count).toFixed(1)
      : null;

  const worthItTotal =
    (doc.worthIt?.yes || 0) +
    (doc.worthIt?.no || 0) +
    (doc.worthIt?.meh || 0);

  return {
    id: String(doc.relatedId),
    _id: String(doc._id),
    type: doc.type,
    slug: doc.slug,
    title,
    cover: doc.cover,
    description: doc.description,
    tags: doc.tags || [],
    year: doc.details?.releaseYear || null,
    rating: avgRating,
    worthIt: doc.worthIt,
    worthItScore:
      worthItTotal > 0
        ? Math.round(((doc.worthIt?.yes || 0) / worthItTotal) * 100)
        : null,
    wheels: doc.wheels || 0,
  };
}

function normalizeExternalAnime(item) {
  const title = item.title?.english || item.title?.romaji || "Untitled";
  return {
    id: item.id,
    type: "anime",
    slug: `${item.id}-${slugify(title)}`,
    title,
    cover: item.coverImage?.large,
    description: item.description?.replace(/<[^>]+>/g, ""),
    tags: (item.genres || []).map((g) => g.toLowerCase()),
    year: item.startDate?.year || null,
    rating: item.averageScore ? (item.averageScore / 20).toFixed(1) : null,
    worthIt: null,
    worthItScore: null,
    wheels: 0,
  };
}

function normalizeExternalMovie(item) {
  const title = item.title || "Untitled";
  return {
    id: item.id,
    type: "movie",
    slug: `${item.id}-${slugify(title)}`,
    title,
    cover: item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : null,
    description: item.overview,
    tags: (item.genre_ids || []).map(() => ""),
    year: item.release_date?.slice(0, 4) || null,
    rating: item.vote_average ? (item.vote_average / 2).toFixed(1) : null,
    worthIt: null,
    worthItScore: null,
    wheels: 0,
  };
}

function normalizeExternalGame(item) {
  return {
    id: item.id,
    type: "game",
    slug: `${item.id}-${item.slug || slugify(item.name)}`,
    title: item.name,
    cover: item.background_image,
    description: null,
    tags: (item.genres || []).map((g) => g.name?.toLowerCase()).filter(Boolean),
    year: item.released?.slice(0, 4) || null,
    rating: item.rating ? item.rating.toFixed(1) : null,
    worthIt: null,
    worthItScore: null,
    wheels: 0,
  };
}

function normalizeExternalCharacter(item) {
  const name =
    item.name?.full || item.name?.native || item.name?.alternative?.[0] || "Unnamed";
  const fav = item.favourites;
  return {
    id: item.id,
    type: "character",
    slug: `${item.id}-${slugify(name)}`,
    title: name,
    cover: item.image?.large,
    description: item.description?.replace(/<[^>]+>/g, ""),
    tags: [],
    year: null,
    rating: null,
    worthIt: null,
    worthItScore: fav >= 1000 ? `${(fav / 1000).toFixed(0)}k` : fav ? String(fav) : null,
    wheels: 0,
  };
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}
