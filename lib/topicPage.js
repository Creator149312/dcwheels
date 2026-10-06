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
import { isTopicDocSafe } from "@/lib/contentSafety";

export const BASE_URL = apiConfig.baseUrl;

/**
 * Race a fetch against a timeout.
 * Falls back to { ok: false } so callers can return empty safe values.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err.name === "AbortError") {
      console.warn(`fetchWithTimeout: ${url} timed out after ${timeoutMs}ms`);
    } else {
      console.warn(`fetchWithTimeout: ${url} failed`, err.message);
    }
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

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
 * Adds a concise year marker when available and intent-matched keywords.
 * Does not alter the simple display title used in-page.
 */
export function optimizeTitle(pageDoc, type) {
  const base = resolveTitle(pageDoc);
  const year = pageDoc?.details?.releaseYear || pageDoc?.details?.year || null;
  const yearStr = year ? ` (${year})` : "";

  let suffix = "";
  if (type === "anime" || type === "game") {
    suffix = " — Ratings, Discussions & Debates";
  } else if (type === "movie") {
    suffix = " — Ratings, Discussions & Debates";
  } else if (type === "character") {
    suffix = " — Powers, Abilities & Matchups";
  }

  let composed = `${base}${yearStr}${suffix}`;

  // Keep within ~70 chars for optimal SERP display without truncation
  if (composed.length > 70) {
    if (type === "anime" || type === "game" || type === "movie") {
      composed = `${base}${yearStr} — Ratings & Discussions`;
    } else if (type === "character") {
      composed = `${base} — Powers & Abilities`;
    }
  }

  if (composed.length > 70) {
    composed = `${base}${yearStr}`;
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
    const pages = await TopicPage.aggregate([
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
      { $limit: 20 },
      { $project: { title: 1, cover: 1, slug: 1, type: 1, tags: 1, description: 1 } },
    ]);

    return pages.filter(isTopicDocSafe).slice(0, 10);
  } catch {
    return [];
  }
}

/**
 * @deprecated Superceded by `getFeedItemsSafe` which provides unified cursor-paginated feeds.
 * Retained for backward-compatibility if external callers reference it.
 *
 * Wheel discovery for a TopicPage.
 * Returns only wheels explicitly linked via `relatedTopics`.
 */
export async function fetchTaggedWheels(_tags, relatedId, type) {
  const LIMIT = 10;
  const PROJECTION = "_id title description wheelPreview createdAt";

  try {
    return Wheel.find({
      relatedTopics: { $elemMatch: { type, id: String(relatedId) } },
    })
      .select(PROJECTION)
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .lean();
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
      fetchWithTimeout(
        `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${apiKey}&language=en-US`,
        { next: { revalidate: 86400 } },
        10000
      ),
      fetchWithTimeout(
        `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${apiKey}`,
        { next: { revalidate: 86400 } },
        10000
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
    const res = await fetchWithTimeout("https://graphql.anilist.co", {
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
    const res = await fetchWithTimeout("https://graphql.anilist.co", {
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
 * Fetches ALL characters for an anime from AniList via paginated GraphQL.
 * Capped at 100 characters to prevent runaway payloads on mega-episodic series.
 */
export async function fetchAllAnimeCharacters(animeId, limit = 100) {
  const all = [];
  const perPage = 25;
  let page = 1;
  let hasNextPage = true;

  const query = `
    query ($id: Int, $page: Int, $perPage: Int) {
      Media(id: $id, type: ANIME) {
        characters(sort: ROLE, page: $page, perPage: $perPage) {
          pageInfo { currentPage lastPage hasNextPage }
          nodes { id name { full native } image { large medium } }
        }
      }
    }
  `;

  while (hasNextPage && all.length < limit) {
    try {
      const res = await fetchWithTimeout("https://graphql.anilist.co", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: animeId, page, perPage } }),
        next: { revalidate: 86400 },
      }, 8000);

      if (!res.ok) break;
      const data = await res.json();
      const chars = data?.data?.Media?.characters;
      const nodes = chars?.nodes || [];

      all.push(...nodes.filter((c) => c && c.name?.full && c.image?.large));

      hasNextPage = chars?.pageInfo?.hasNextPage ?? false;
      page++;
    } catch (err) {
      console.warn(`fetchAllAnimeCharacters page ${page} failed:`, err.message);
      break;
    }
  }

  return all.slice(0, limit);
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
      fetchWithTimeout(`${RAWG_BASE_URL}/games/${gameId}?key=${apiKey}`, { next: { revalidate: 86400 } }),
      fetchWithTimeout(`${RAWG_BASE_URL}/games/${gameId}/stores?key=${apiKey}`, { next: { revalidate: 86400 } }),
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
