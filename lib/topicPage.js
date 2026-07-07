/**
 * lib/topicPage.js — Shared server-side utilities for all content-type pages.
 *
 * Deliberately contains NO type-specific API imports (no @spkrbox/anilist,
 * no openai at the module level, no TMDB/RAWG fetchers). Each type-specific
 * page (movie/, anime/, game/, character/) imports only what it needs so
 * Next.js can tree-shake unused API clients per route bundle.
 */

import TopicPage from "@/models/topicpage";
import Wheel from "@/models/wheel";
import apiConfig from "@utils/ApiUrlConfig";

export const BASE_URL = apiConfig.baseUrl;

// ---------------------------------------------------------------------------
// Slug / title helpers
// ---------------------------------------------------------------------------

/** Parse the numeric external-API id from a slug like "1234-some-title". */
export function extractId(param) {
  const id = parseInt(param.split("-")[0], 10);
  return isNaN(id) ? null : id;
}

/**
 * Resolve the best human-readable display title from a TopicPage document.
 * Handles the different title shapes stored per content type.
 */
export function resolveTitle(pageDoc) {
  return (
    pageDoc.title?.default ||
    pageDoc.title?.english ||
    pageDoc.title?.romaji ||
    pageDoc.title?.localized ||
    pageDoc.title?.original ||
    pageDoc.name?.full ||
    "Untitled"
  );
}

/**
 * Produce an optimized meta title used for the browser tab and SEO.
 * Adds a concise year marker when available: "Title (Year)".
 * Does not alter the simple display title used in-page.
 */
export function optimizeTitle(pageDoc /*, type - retained for compatibility */) {
  const base = resolveTitle(pageDoc);
  const year = pageDoc?.details?.releaseYear || pageDoc?.details?.year || null;
  let composed = year ? `${base} (${year})` : base;

  // Truncate for metadata length safety
  if (composed.length > 80) {
    return composed.slice(0, 77).trim() + "...";
  }
  return composed;
}

/**
 * Build the Next.js generateMetadata return object for a content page.
 * Called by each type-specific page after it has resolved the pageDoc.
 */
export function buildPageMetadata(type, slug, pageDoc) {
  const title = optimizeTitle(pageDoc, type);
  const description =
    pageDoc.description?.slice(0, 160) ||
    "Explore details and community-generated wheels.";
  const image = pageDoc.cover || `${BASE_URL}/default-cover.jpg`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [image],
      url: `${BASE_URL}/${type}/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

// ---------------------------------------------------------------------------
// Affiliate links
// ---------------------------------------------------------------------------

/**
 * Build "Where to Watch / Buy" affiliate links for a content item.
 * JustWatch and Amazon work as simple search URLs — no API key required.
 * If AMAZON_AFFILIATE_TAG is set in env, the Amazon link carries the tag.
 */
export function buildAffiliateLinks(type, title) {
  const q = encodeURIComponent(title);
  const amzTag = process.env.AMAZON_AFFILIATE_TAG;
  const amzSuffix = amzTag ? `&tag=${encodeURIComponent(amzTag)}` : "";
  const links = [];

  if (["movie", "tv", "anime"].includes(type)) {
    links.push({
      name: "JustWatch",
      url: `https://www.justwatch.com/us/search?q=${q}`,
    });
  }
  if (["movie", "tv"].includes(type)) {
    links.push({
      name: "Prime Video",
      url: `https://www.amazon.com/s?k=${q}&i=instant-video${amzSuffix}`,
    });
  }
  if (type === "anime") {
    links.push({
      name: "Crunchyroll",
      url: `https://www.crunchyroll.com/search?q=${q}`,
    });
  }
  if (type === "game") {
    links.push({
      name: "Amazon",
      url: `https://www.amazon.com/s?k=${q}&i=videogames${amzSuffix}`,
    });
  }

  return links;
}

// ---------------------------------------------------------------------------
// MongoDB queries (shared, no type-specific logic)
// ---------------------------------------------------------------------------

/**
 * Fetches related TopicPages from MongoDB by overlapping tags.
 * Excludes the current page; limits to 10 results sorted by tag overlap.
 */
export async function getRelatedPages(tags, currentId) {
  if (!tags?.length) return [];
  try {
    return TopicPage.aggregate([
      { $match: { tags: { $in: tags.slice(0, 10) }, _id: { $ne: currentId } } },
      {
        $addFields: {
          overlapCount: {
            $size: {
              $filter: { input: "$tags", as: "t", cond: { $in: ["$$t", tags] } },
            },
          },
        },
      },
      { $sort: { overlapCount: -1, createdAt: -1 } },
      { $limit: 10 },
      { $project: { title: 1, cover: 1, slug: 1, type: 1 } },
    ]);
  } catch {
    return [];
  }
}

/**
 * Tiered wheel discovery for a TopicPage.
 *
 * 1. PRIMARY — wheels explicitly linked via `relatedTopics`.
 * 2. FALLBACK — tag-overlap aggregation fills remaining slots up to the limit.
 */
export async function fetchTaggedWheels(tags, relatedId, type) {
  const LIMIT = 10;
  const PROJECTION = "_id title description wheelPreview createdAt";

  try {
    const direct = await Wheel.find({
      relatedTopics: { $elemMatch: { type, id: String(relatedId) } },
    })
      .select(PROJECTION)
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean();

    if (direct.length >= LIMIT || !tags?.length) return direct;

    const excludeIds = direct.map((w) => w._id);
    const fallback = await Wheel.aggregate([
      {
        $match: {
          tags: { $in: tags },
          wheelPreview: { $ne: null },
          _id: { $nin: excludeIds },
        },
      },
      {
        $addFields: {
          overlapCount: {
            $size: {
              $filter: { input: "$tags", as: "t", cond: { $in: ["$$t", tags] } },
            },
          },
        },
      },
      { $sort: { overlapCount: -1, createdAt: -1 } },
      { $limit: LIMIT - direct.length },
      { $project: { _id: 1, title: 1, description: 1, wheelPreview: 1, createdAt: 1 } },
    ]);

    return [...direct, ...fallback];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Topic-linked posts
// ---------------------------------------------------------------------------

/**
 * Fetches community posts linked to a TopicPage via contentRef.
 * Uses dynamic import for the Post model to keep this module tree-shakeable.
 * Returns plain serializable objects safe to pass to client components.
 */
export async function getTopicPosts(type, relatedId, limit = 8) {
  try {
    const { default: Post } = await import("@/models/post");
    const { default: User } = await import("@/models/user");
    const posts = await Post.find({
      "contentRef.type": type,
      "contentRef.externalId": String(relatedId),
      isPublic: true,
      shadowBanned: { $ne: true },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const userIds = [...new Set(posts.map((p) => p.userId).filter(Boolean).map(String))];
    const users = userIds.length
      ? await User.find({ _id: { $in: userIds } }).select("name").lean()
      : [];
    const nameById = new Map(users.map((u) => [String(u._id), u.name || "Community"]));

    return posts.map((p) => ({
      id: String(p._id),
      _id: String(p._id),
      content: p.content || "",
      hasTruncation: p.hasTruncation || false,
      authorName: p.authorName || nameById.get(String(p.userId)) || "Community",
      authorImage: p.authorImage || null,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt),
      hasPoll: p.hasPoll || false,
      pollOptions: (p.pollOptions || []).map((o) => ({
        _id: String(o._id),
        text: o.text,
        voteCount: o.voteCount || 0,
      })),
      likeCount: p.likeCount || 0,
      commentCount: p.commentCount || 0,
      tags: p.tags || [],
      image: p.image || null,
    }));
  } catch (err) {
    console.error("getTopicPosts error:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// External API Fetchers (Extras)
// ---------------------------------------------------------------------------

/**
 * Fetches the YouTube trailer key and US streaming providers for a movie via TMDB.
 * Returns { trailerKey, streaming[], watchLink } where watchLink is the
 * JustWatch aggregated page for US providers.
 */
export async function fetchMovieExtras(movieId) {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return { trailerKey: null, streaming: [], watchLink: null };
  try {
    const [videosRes, providersRes] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=en-US`,
        { next: { revalidate: 86400 } }
      ),
      fetch(
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${apiKey}`,
        { next: { revalidate: 86400 } }
      ),
    ]);
    const videos = videosRes.ok ? await videosRes.json() : { results: [] };
    const providers = providersRes.ok ? await providersRes.json() : { results: {} };

    // Prefer an "official" YouTube trailer; fall back to any YouTube result
    const trailer =
      (videos.results || []).find((v) => v.type === "Trailer" && v.site === "YouTube") ||
      (videos.results || []).find((v) => v.site === "YouTube");

    const usProviders = providers.results?.US;
    const streaming = [
      ...(usProviders?.flatrate || []),
      ...(usProviders?.free || []),
      ...(usProviders?.ads || []),
    ].slice(0, 6);

    return {
      trailerKey: trailer?.key || null,
      streaming: streaming.map((p) => ({ ...p, url: usProviders?.link || null })),
      watchLink: usProviders?.link || null,
    };
  } catch {
    return { trailerKey: null, streaming: [], watchLink: null };
  }
}

/**
 * Fetches the YouTube trailer key and streaming links for an anime via AniList GraphQL.
 */
export async function fetchAnimeExtras(animeId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        trailer { id site }
        externalLinks { url site type }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: animeId } }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { trailerKey: null, streaming: [] };
    const data = await res.json();
    const media = data.data?.Media;
    const trailerKey = media?.trailer?.site === "youtube" ? media.trailer.id : null;
    const streaming = (media?.externalLinks || [])
      .filter((l) => l.type === "STREAMING")
      .slice(0, 6);
    return { trailerKey, streaming };
  } catch {
    return { trailerKey: null, streaming: [] };
  }
}

/**
 * Fetches anime characters from AniList.
 */
export async function fetchAnimeCharacters(animeId) {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        characters(sort: ROLE, perPage: 12) {
          nodes {
            id
            name { full }
            image { large }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { id: animeId } }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const characters = data.data?.Media?.characters?.nodes || [];
    return characters.filter((c) => c && c.name?.full && c.image?.large);
  } catch {
    return [];
  }
}

/**
 * Fetches store links for a game from RAWG.
 */
export async function fetchGameExtras(gameId) {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey) return { trailerKey: null, streaming: [] };
  const RAWG_BASE_URL = "https://api.rawg.io/api";
  try {
    const [detailRes, storesRes] = await Promise.all([
      fetch(`${RAWG_BASE_URL}/games/${gameId}?key=${apiKey}`, { next: { revalidate: 86400 } }),
      fetch(`${RAWG_BASE_URL}/games/${gameId}/stores?key=${apiKey}`, { next: { revalidate: 86400 } }),
    ]);
    if (!detailRes.ok) return { trailerKey: null, streaming: [] };

    const detail = await detailRes.json();
    const storesData = storesRes.ok ? await storesRes.json() : { results: [] };
    const urlMap = {};
    for (const s of storesData.results || []) {
      urlMap[s.store_id] = s.url;
    }

    const streaming = (detail.stores || []).slice(0, 6).map((s) => ({
      url: urlMap[s.store.id] || null,
      store: s.store,
    }));

    return { trailerKey: null, streaming };
  } catch {
    return { trailerKey: null, streaming: [] };
  }
}

// ---------------------------------------------------------------------------
// OpenAI description rewrite (fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * Background rewrite — called fire-and-forget after a TopicPage is created.
 * Lazy-imports `openai` at call time so the package is NOT included in any
 * server bundle unless OPENAI_API_KEY is present and the function actually runs.
 * Errors are swallowed so a failed rewrite never breaks anything for users.
 */
export async function rewriteAndPersist(topicPageId, originalText, type) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || !originalText) return;
  try {
    // Dynamic import — only evaluated when an API key exists.
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: openaiKey });
    const prompt = `Rewrite the following ${type} description in a casual descriptive way in 100 words. Make it sound unique and engaging:\n\n"${originalText}"`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
    });
    const rewritten = response.choices?.[0]?.message?.content?.trim();
    if (rewritten) {
      await TopicPage.updateOne(
        { _id: topicPageId },
        { $set: { description: rewritten } }
      );
    }
  } catch (err) {
    console.error("OpenAI rewrite failed:", err);
  }
}
