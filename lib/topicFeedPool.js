import { unstable_cache } from "next/cache";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import { SPOTLIGHT_SLUGS } from "@app/(content)/[type]/getCategorySpotlight";

const TOPIC_POOL_REVALIDATE = 3600; // 1 hour cache TTL
const VALID_TOPIC_TYPES = ["anime", "movie", "game", "character"];

function pickString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return (
      value.default ||
      value.english ||
      value.romaji ||
      value.localized ||
      value.original ||
      ""
    );
  }
  return String(value);
}

function stripHtmlAndTruncate(text, maxLen = 220) {
  if (!text) return "";
  const cleaned = String(text)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).trimEnd() + "…";
}

function formatFeedTopic(doc) {
  const title = pickString(doc.title) || "Untitled";
  const ratingAvg =
    doc.rating?.count > 0
      ? Math.round((doc.rating.totalScore / doc.rating.count) * 10) / 10
      : null;

  const yesVotes = doc.worthIt?.yes || 0;
  const noVotes = doc.worthIt?.no || 0;
  const mehVotes = doc.worthIt?.meh || 0;
  const totalWorthVotes = yesVotes + noVotes + mehVotes;
  const worthItPct =
    totalWorthVotes > 0 ? Math.round((yesVotes / totalWorthVotes) * 100) : null;

  return {
    _id: String(doc._id),
    id: String(doc._id),
    _docType: "topic",
    docType: "topic",
    relatedId: String(doc.relatedId || doc._id),
    type: doc.type,
    topicType: doc.type,
    name: title,
    title,
    slug: pickString(doc.slug),
    cover: pickString(doc.cover),
    description: stripHtmlAndTruncate(pickString(doc.description), 650),
    releaseYear: doc.details?.releaseYear || null,
    studioOrDirector:
      doc.details?.studio || doc.details?.director || doc.details?.platform || null,
    episodes: doc.details?.episodes || null,
    runtime: doc.details?.runtime || null,
    tags: Array.isArray(doc.tags) ? doc.tags.slice(0, 8) : [],
    rating: ratingAvg,
    ratingCount: doc.rating?.count || 0,
    worthItPct,
    wheelsCount: doc.wheels || 0,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt || new Date().toISOString()),
  };
}

async function _fetchTopicPoolByTypeUncached(type) {
  await connectMongoDB();

  const excludedSlugs = (SPOTLIGHT_SLUGS[type] || []).map((s) =>
    s.replace(/^\/[^/]+\//, "").trim()
  );

  try {
    const query = {
      type,
      cover: { $exists: true, $nin: ["", null] },
      description: { $exists: true, $regex: /^.{40,}/s },
    };

    if (excludedSlugs.length > 0) {
      query.slug = { $nin: excludedSlugs };
    }

    const docs = await TopicPage.find(query)
      .sort({ wheels: -1, "rating.count": -1, createdAt: -1 })
      .limit(40)
      .select(
        "_id relatedId type slug title cover description tags details wheels rating worthIt createdAt"
      )
      .lean();

    return (docs || []).map(formatFeedTopic);
  } catch (err) {
    console.error(`[TopicFeedPool] Failed to fetch pool for ${type}:`, err);
    return [];
  }
}

const getCachedPoolForType = unstable_cache(
  _fetchTopicPoolByTypeUncached,
  ["feed-topic-pool-v2"],
  { revalidate: TOPIC_POOL_REVALIDATE, tags: ["feed-topic-pool"] }
);

/**
 * Pick 1 TopicPage card for a given feed page offset and optional category type.
 * - On `/movie`, `/anime`, `/game`, `/character`: returns a topic strictly from that category.
 * - On Global Feed (`/`): interleaves across all 4 categories deterministically by pageOffset.
 */
export async function pickTopicForFeedPage({ type = null, pageOffset = 0, tag = null } = {}) {
  const safeOffset = Math.max(0, Number(pageOffset) || 0);
  const normalizedType = type && VALID_TOPIC_TYPES.includes(type) ? type : null;

  if (normalizedType) {
    const pool = await getCachedPoolForType(normalizedType);
    if (!pool || pool.length === 0) return null;

    // If a tag filter is active on the category page, prefer matching topics first
    if (tag) {
      const cleanTag = String(tag).toLowerCase().trim();
      const matching = pool.filter((t) =>
        (t.tags || []).some((tg) => String(tg).toLowerCase() === cleanTag)
      );
      if (matching.length > 0) {
        return matching[safeOffset % matching.length];
      }
    }

    return pool[safeOffset % pool.length];
  }

  // Global feed: rotate across anime -> movie -> game -> character per page
  const targetType = VALID_TOPIC_TYPES[safeOffset % VALID_TOPIC_TYPES.length];
  const bucketIndex = Math.floor(safeOffset / VALID_TOPIC_TYPES.length);
  const pool = await getCachedPoolForType(targetType);
  if (!pool || pool.length === 0) return null;

  return pool[bucketIndex % pool.length];
}
