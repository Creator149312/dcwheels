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
 * Build the Next.js generateMetadata return object for a content page.
 * Called by each type-specific page after it has resolved the pageDoc.
 */
export function buildPageMetadata(type, slug, pageDoc) {
  const title = resolveTitle(pageDoc);
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
