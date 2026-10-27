import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import UnifiedList from "@models/unifiedlist";
import TopicPage from "@models/topicpage";
import Wheel from "@models/wheel";
import User from "@models/user";
import { runTopicAtlasSearch } from "@lib/search/topicSearch";
import { runWheelAtlasSearch } from "@lib/search/wheelSearch";
import { unstable_cache } from "next/cache";

const SEARCH_CACHE_TTL = 120; // 2 minutes server-side cache for high-traffic search terms
const MAX_REGEX_TIME_MS = 1500; // Circuit breaker to prevent unanchored regex hanging MongoDB

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQueryRegex(q) {
  const words = q
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 5);

  if (words.length === 0) {
    return new RegExp(escapeRegex(q.trim()), "i");
  }

  const lookaheads = words.map((w) => `(?=.*${escapeRegex(w)})`).join("");
  return new RegExp(`${lookaheads}.*`, "i");
}

function extractNormalizedTags(q) {
  return q
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9-]/g, ""))
    .filter((w) => w.length >= 2)
    .slice(0, 5);
}

/**
 * Search Community Posts matching query across content, tags, contentRef, and entities.
 * Fast Path: Reuses existing indexes (tags, contentRef.externalId, entities.externalId).
 * Safe Limit: Fetches limit + 1 to derive hasMore without full-collection countDocuments().
 */
async function searchPostsUncached(rawQuery, { limit = 20, skip = 0, matchedTopicIds = [] } = {}) {
  const q = String(rawQuery || "").trim();
  if (q.length < 2) return { posts: [], hasMore: false };

  await connectMongoDB();

  const normalizedTags = extractNormalizedTags(q);
  const tagRegex = normalizedTags.length > 0 ? new RegExp(normalizedTags.map(escapeRegex).join("|"), "i") : null;
  const regexAll = buildQueryRegex(q);

  // Fast-path indexed match: checks tags and matched topic IDs first
  const indexedOr = [];
  if (normalizedTags.length > 0) {
    indexedOr.push({ tags: { $in: normalizedTags } });
  }
  if (matchedTopicIds.length > 0) {
    indexedOr.push({ "contentRef.externalId": { $in: matchedTopicIds } });
    indexedOr.push({ "entities.externalId": { $in: matchedTopicIds } });
  }

  let rawPosts = [];

  if (indexedOr.length > 0) {
    rawPosts = await Post.find({
      isPublic: { $ne: false },
      $or: indexedOr,
    })
      .sort({ hotScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .lean();
  }

  // Fallback: If indexed lookup found fewer than requested, run bounded regex match
  if (rawPosts.length < limit + 1) {
    const needed = limit + 1 - rawPosts.length;
    const existingIds = new Set(rawPosts.map((p) => String(p._id)));

    const regexOr = [
      { content: { $regex: regexAll } },
      { "contentRef.title": { $regex: regexAll } },
      { "entities.title": { $regex: regexAll } },
    ];
    if (tagRegex) regexOr.push({ tags: { $in: [tagRegex] } });

    const regexPosts = await Post.find({
      isPublic: { $ne: false },
      _id: { $nin: Array.from(existingIds) },
      $or: regexOr,
    })
      .maxTimeMS(MAX_REGEX_TIME_MS)
      .sort({ hotScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(needed)
      .lean()
      .catch(() => []);

    rawPosts.push(...regexPosts);
  }

  const hasMore = rawPosts.length > limit;
  const slicePosts = rawPosts.slice(0, limit);

  if (slicePosts.length === 0) return { posts: [], hasMore: false };

  const userIds = [
    ...new Set(
      slicePosts
        .map((p) => (p.userId ? String(p.userId) : null))
        .filter(Boolean)
    ),
  ];

  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select("_id name username image")
          .lean()
      : [];

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const posts = slicePosts.map((r) => {
    const u = r.userId ? userMap.get(String(r.userId)) : null;
    return {
      id: String(r._id),
      _id: String(r._id),
      docType: "post",
      userId: r.userId ? String(r.userId) : null,
      content: r.content || "",
      authorName: r.authorName || u?.name || "Community",
      authorHandle: r.authorHandle || u?.username || null,
      authorImage: r.authorImage || u?.image || null,
      hasPoll: r.hasPoll || false,
      pollOptions: (r.pollOptions || []).map((o) => ({
        _id: String(o._id),
        text: o.text,
        image: o.image || null,
        imageVariants: o.imageVariants
          ? {
              sm: o.imageVariants.sm || null,
              md: o.imageVariants.md || null,
            }
          : null,
        voteCount: o.voteCount || 0,
      })),
      likeCount: r.likeCount || 0,
      commentCount: r.commentCount || 0,
      image: r.image || null,
      imageVariants: r.imageVariants
        ? {
            sm: r.imageVariants.sm || null,
            md: r.imageVariants.md || null,
            lg: r.imageVariants.lg || null,
          }
        : null,
      contentRef: r.contentRef || null,
      entities:
        Array.isArray(r.entities) && r.entities.length > 0
          ? r.entities
          : r.contentRef
          ? [r.contentRef]
          : [],
      ogMeta: r.ogMeta || null,
      category: r.category || null,
      tags: r.tags || [],
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt || new Date().toISOString()),
    };
  });

  return { posts, hasMore };
}

/**
 * Search Community Lists matching query across name, description, tags, and items.
 * Projects items: { $slice: 12 } to avoid pulling hundreds of array items across wire.
 * Uses limit + 1 for hasMore pagination without countDocuments.
 */
async function searchListsUncached(rawQuery, { limit = 15, skip = 0, matchedTopicIds = [] } = {}) {
  const q = String(rawQuery || "").trim();
  if (q.length < 2) return { lists: [], hasMore: false };

  await connectMongoDB();

  const normalizedTags = extractNormalizedTags(q);
  const tagRegex = normalizedTags.length > 0 ? new RegExp(normalizedTags.map(escapeRegex).join("|"), "i") : null;
  const regexAll = buildQueryRegex(q);

  const baseFilter = {
    isPublic: true,
    isDeleted: { $ne: true },
    "items.4": { $exists: true },
    "items.type": "entity",
  };

  // Fast-path indexed match: checks tags and items.entityId
  const indexedOr = [];
  if (normalizedTags.length > 0) {
    indexedOr.push({ tags: { $in: normalizedTags } });
  }
  if (matchedTopicIds.length > 0) {
    indexedOr.push({ "items.entityId": { $in: matchedTopicIds } });
  }

  let rawLists = [];

  const listProjection = {
    name: 1,
    title: 1,
    description: 1,
    userId: 1,
    items: { $slice: 12 },
    likeCount: 1,
    commentCount: 1,
    slug: 1,
    format: 1,
    tags: 1,
    createdAt: 1,
  };

  if (indexedOr.length > 0) {
    rawLists = await UnifiedList.find({
      ...baseFilter,
      $or: indexedOr,
    })
      .select(listProjection)
      .sort({ likeCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .lean();
  }

  // Fallback: If indexed check found fewer than requested, run bounded regex match
  if (rawLists.length < limit + 1) {
    const needed = limit + 1 - rawLists.length;
    const existingIds = new Set(rawLists.map((l) => String(l._id)));

    const regexOr = [
      { name: { $regex: regexAll } },
      { description: { $regex: regexAll } },
      { "items.name": { $regex: regexAll } },
    ];
    if (tagRegex) regexOr.push({ tags: { $in: [tagRegex] } });

    const regexLists = await UnifiedList.find({
      ...baseFilter,
      _id: { $nin: Array.from(existingIds) },
      $or: regexOr,
    })
      .select(listProjection)
      .maxTimeMS(MAX_REGEX_TIME_MS)
      .sort({ likeCount: -1, createdAt: -1 })
      .skip(skip)
      .limit(needed)
      .lean()
      .catch(() => []);

    rawLists.push(...regexLists);
  }

  const hasMore = rawLists.length > limit;
  const sliceLists = rawLists.slice(0, limit);

  if (sliceLists.length === 0) return { lists: [], hasMore: false };

  const userIds = [
    ...new Set(
      sliceLists
        .map((l) => (l.userId ? String(l.userId) : null))
        .filter(Boolean)
    ),
  ];

  const users =
    userIds.length > 0
      ? await User.find({ _id: { $in: userIds } })
          .select("_id name username")
          .lean()
      : [];

  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const lists = sliceLists.map((r) => {
    const u = r.userId ? userMap.get(String(r.userId)) : null;
    return {
      id: String(r._id),
      _id: String(r._id),
      docType: "list",
      name: r.name || r.title || "Untitled List",
      title: r.name || r.title || "Untitled List",
      userId: r.userId ? String(r.userId) : null,
      authorName: u?.name || "Community",
      authorHandle: u?.username || null,
      description: r.description || "",
      items: (r.items || []).map((item, idx) => ({
        ...item,
        _id: item._id ? String(item._id) : `${r._id}-${idx}`,
      })),
      itemCount: r.items?.length || 0,
      likeCount: r.likeCount || 0,
      commentCount: r.commentCount || 0,
      isPublic: true,
      slug: r.slug || null,
      format: r.format || "standard",
      tags: r.tags || [],
      createdAt:
        r.createdAt instanceof Date
          ? r.createdAt.toISOString()
          : String(r.createdAt || new Date().toISOString()),
    };
  });

  return { lists, hasMore };
}

/**
 * Search top TopicPage hubs formatted directly for <TopicFeedCard />
 * Uses Atlas Search autocomplete first, then text index, then prefix regex.
 */
async function searchTopicHubsUncached(rawQuery, { limit = 2, skip = 0, type = null } = {}) {
  const q = String(rawQuery || "").trim();
  if (q.length < 2) return { topics: [], hasMore: false };

  await connectMongoDB();

  let docs = [];

  // 1. Try Atlas Search
  try {
    docs = await runTopicAtlasSearch(TopicPage, q, limit + 1 + skip, {
      cover: 1,
      description: 1,
      details: 1,
      rating: 1,
      worthIt: 1,
      wheels: 1,
      createdAt: 1,
      type: 1,
    });
  } catch {
    docs = [];
  }

  // 2. Fallback: text / prefix regex
  if (!docs || docs.length === 0) {
    const escaped = escapeRegex(q);
    const prefixRegex = new RegExp(`^${escaped}`, "i");
    const anyRegex = new RegExp(escaped, "i");

    const queryFilter = {
      $or: [
        { "title.default": { $regex: prefixRegex } },
        { "title.english": { $regex: prefixRegex } },
        { "title.default": { $regex: anyRegex } },
        { slug: { $regex: prefixRegex } },
      ],
    };

    if (type && type !== "all" && type !== "topics") {
      queryFilter.type = type;
    }

    docs = await TopicPage.find(queryFilter)
      .select("type relatedId slug title cover description tags details rating worthIt wheels createdAt")
      .maxTimeMS(MAX_REGEX_TIME_MS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1)
      .lean()
      .catch(() => []);
  }

  if (!docs || docs.length === 0) return { topics: [], hasMore: false };

  const qLower = q.toLowerCase();
  const scored = docs
    .map((doc) => {
      const title = String(
        doc.title?.default ||
          doc.title?.english ||
          doc.title?.romaji ||
          doc.title?.localized ||
          doc.slug ||
          ""
      ).toLowerCase();
      let score = 0;
      if (title === qLower) score += 100;
      else if (title.startsWith(qLower)) score += 60;
      else if (title.includes(qLower)) score += 35;
      score += Math.min(20, (doc.rating?.count || 0) * 2);
      return { doc, score };
    })
    .sort((a, b) => b.score - a.score);

  const seenTitles = new Set();
  const results = [];

  for (const { doc } of scored) {
    if (type && type !== "all" && type !== "topics" && doc.type !== type) {
      continue;
    }

    const rawTitle =
      doc.title?.default ||
      doc.title?.english ||
      doc.title?.romaji ||
      doc.title?.localized ||
      doc.slug ||
      "Untitled";
    const key = `${doc.type}:${rawTitle.toLowerCase().trim()}`;
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);

    const avgRating =
      doc.rating?.count > 0
        ? Number((doc.rating.totalScore / doc.rating.count).toFixed(1))
        : null;

    const worthItTotal =
      (doc.worthIt?.yes || 0) +
      (doc.worthIt?.no || 0) +
      (doc.worthIt?.meh || 0);
    const worthItPct =
      worthItTotal > 0
        ? Math.round(((doc.worthIt?.yes || 0) / worthItTotal) * 100)
        : null;

    const cleanDesc = String(doc.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 650);

    results.push({
      id: String(doc._id),
      _id: String(doc._id),
      docType: "topic",
      type: doc.type || "anime",
      topicType: doc.type || "anime",
      relatedId: doc.relatedId ? String(doc.relatedId) : String(doc._id),
      name: rawTitle,
      title: rawTitle,
      slug: doc.slug,
      cover: doc.cover || null,
      description: cleanDesc,
      releaseYear: doc.details?.releaseYear || null,
      studioOrDirector:
        doc.details?.studio ||
        doc.details?.director ||
        doc.details?.developer ||
        null,
      episodes: doc.details?.episodes || null,
      runtime: doc.details?.runtime || null,
      tags: (doc.tags || []).slice(0, 8),
      rating: avgRating,
      ratingCount: doc.rating?.count || 0,
      worthItPct,
      wheelsCount: Array.isArray(doc.wheels)
        ? doc.wheels.length
        : Number(doc.wheels) || 0,
    });
  }

  const hasMore = results.length > limit;
  const sliceTopics = results.slice(0, limit);

  return { topics: sliceTopics, hasMore };
}

/**
 * Search Wheels directly for the unified "Top" search tab.
 * Uses Atlas Search first, limit + 1 for hasMore.
 */
async function searchWheelsDirectUncached(rawQuery, { limit = 6, skip = 0 } = {}) {
  const q = String(rawQuery || "").trim();
  if (q.length < 2) return { wheels: [], hasMore: false };

  await connectMongoDB();

  const wheelProjection =
    "_id title description slug wheelPreview authorName authorHandle authorProfileImage tags likeCount commentCount isPublic createdAt data";

  try {
    const docs = await runWheelAtlasSearch(Wheel, q, limit + 1 + skip, { data: 1 });
    if (docs && docs.length > 0) {
      const paged = docs.slice(skip, skip + limit + 1);
      const hasMore = paged.length > limit;
      const sliceDocs = paged.slice(0, limit);
      return {
        wheels: sliceDocs.map((r) => ({
          _id: String(r._id),
          id: String(r._id),
          docType: "wheel",
          title: r.title,
          description: r.description || "",
          slug: r.slug,
          wheelPreview: r.wheelPreview || null,
          authorName: r.authorName || "Community",
          authorHandle: r.authorHandle || null,
          authorProfileImage: r.authorProfileImage || null,
          tags: r.tags || [],
          likeCount: r.likeCount || 0,
          commentCount: r.commentCount || 0,
          isPublic: r.isPublic ?? true,
          createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
          segmentCount: Array.isArray(r.data) ? r.data.length : 0,
          data: { length: Array.isArray(r.data) ? r.data.length : 0 },
        })),
        hasMore,
      };
    }
  } catch {
    // Atlas Search unavailable, fall back to prefix regex
  }

  const escaped = escapeRegex(q);
  const regexPrefix = new RegExp(escaped, "i");
  const rawWheels = await Wheel.find({
    title: { $regex: regexPrefix },
    isDeleted: { $ne: true },
  })
    .maxTimeMS(MAX_REGEX_TIME_MS)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit + 1)
    .select(wheelProjection)
    .lean()
    .catch(() => []);

  const hasMore = rawWheels.length > limit;
  const sliceWheels = rawWheels.slice(0, limit);

  return {
    wheels: sliceWheels.map((r) => ({
      _id: String(r._id),
      id: String(r._id),
      docType: "wheel",
      title: r.title,
      description: r.description || "",
      slug: r.slug,
      wheelPreview: r.wheelPreview || null,
      authorName: r.authorName || "Community",
      authorHandle: r.authorHandle || null,
      authorProfileImage: r.authorProfileImage || null,
      tags: r.tags || [],
      likeCount: r.likeCount || 0,
      commentCount: r.commentCount || 0,
      isPublic: r.isPublic ?? true,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      segmentCount: Array.isArray(r.data) ? r.data.length : 0,
      data: { length: Array.isArray(r.data) ? r.data.length : 0 },
    })),
    hasMore,
  };
}

/**
 * Exported Cached Search Functions (120s TTL)
 */
export async function searchPosts(rawQuery, options = {}) {
  const q = String(rawQuery || "").trim().toLowerCase();
  const limit = options.limit || 20;
  const skip = options.skip || 0;
  const cacheKey = `search-posts-${q}-${limit}-${skip}`;

  return unstable_cache(
    async () => searchPostsUncached(rawQuery, options),
    [cacheKey],
    { revalidate: SEARCH_CACHE_TTL, tags: ["search-feed"] }
  )();
}

export async function searchLists(rawQuery, options = {}) {
  const q = String(rawQuery || "").trim().toLowerCase();
  const limit = options.limit || 15;
  const skip = options.skip || 0;
  const cacheKey = `search-lists-${q}-${limit}-${skip}`;

  return unstable_cache(
    async () => searchListsUncached(rawQuery, options),
    [cacheKey],
    { revalidate: SEARCH_CACHE_TTL, tags: ["search-feed"] }
  )();
}

export async function searchTopicHubs(rawQuery, options = {}) {
  const q = String(rawQuery || "").trim().toLowerCase();
  const limit = options.limit || 2;
  const skip = options.skip || 0;
  const type = options.type || "all";
  const cacheKey = `search-topics-${q}-${type}-${limit}-${skip}`;

  return unstable_cache(
    async () => searchTopicHubsUncached(rawQuery, options),
    [cacheKey],
    { revalidate: SEARCH_CACHE_TTL, tags: ["search-feed"] }
  )();
}

export async function searchWheelsDirect(rawQuery, options = {}) {
  const q = String(rawQuery || "").trim().toLowerCase();
  const limit = options.limit || 6;
  const skip = options.skip || 0;
  const cacheKey = `search-wheels-${q}-${limit}-${skip}`;

  return unstable_cache(
    async () => searchWheelsDirectUncached(rawQuery, options),
    [cacheKey],
    { revalidate: SEARCH_CACHE_TTL, tags: ["search-feed"] }
  )();
}
