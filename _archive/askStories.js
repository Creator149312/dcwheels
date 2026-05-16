import { connectMongoDB } from "@lib/mongodb";
import AskDilemma from "@models/askDilemma";
import AskVote from "@models/askVote";
import User from "@models/user";

/**
 * Fetch paginated list of active public dilemmas for the Ask feed.
 * Joins author name from User. Returns serializable plain objects.
 */
export async function getActiveAsks({ limit = 20, skip = 0, tag } = {}) {
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit)));
  const safeSkip = Math.max(0, Number(skip));

  const query = {
    isPublic: true,
    status: "active",
    expiresAt: { $gt: new Date() },
  };
  if (tag && typeof tag === "string") {
    query.tags = tag.toLowerCase().trim();
  }

  const rows = await AskDilemma.find(query)
    .sort({ isPinned: -1, createdAt: -1 })
    .skip(safeSkip)
    .limit(safeLimit)
    .lean();

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name").lean()
    : [];

  const nameById = new Map(users.map((u) => [String(u._id), u.name || "Anonymous"]));

  return rows.map((r) => serializeAsk(r, nameById));
}

/**
 * Fetch a single dilemma by ID with vote counts per option.
 */
export async function getAskById(id) {
  await connectMongoDB();

  const row = await AskDilemma.findById(id).lean();
  if (!row) return null;

  const user = await User.findById(row.userId).select("name").lean();
  const nameById = new Map([[String(row.userId), user?.name || "Anonymous"]]);

  return serializeAsk(row, nameById);
}

function serializeAsk(row, nameById) {
  return {
    id: String(row._id),
    question: row.question,
    authorName: nameById.get(String(row.userId)) || "Anonymous",
    authorId: String(row.userId),
    status: row.status,
    expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    tags: row.tags || [],
    topicType: row.topicType || "general",
    topicTags: row.topicTags || [],
    isPinned: !!row.isPinned,
    finalDecision: row.finalDecision ? String(row.finalDecision) : null,
    options: (row.options || []).map((opt) => ({
      id: String(opt._id),
      text: opt.text,
      imageUrl: opt.imageUrl || null,
      voteCount: opt.voteCount || 0,
      catalogRef: opt.catalogRef
        ? {
            type: opt.catalogRef.type,
            externalId: opt.catalogRef.externalId || null,
            canonicalSlug: opt.catalogRef.canonicalSlug || null,
            posterUrl: opt.catalogRef.posterUrl || null,
            metadata: opt.catalogRef.metadata || null,
          }
        : null,
    })),
  };
}

/**
 * Fetch active asks relevant to a specific content page.
 * 1. Asks where any option's catalogRef.externalId matches this exact entity.
 * 2. OR asks with matching topicType + overlapping topicTags (tag-overlap fallback).
 * Used by the /(content)/[type]/[slug] detail page to surface contextual debates.
 */
export async function getTopicAsks(type, relatedId, tags, limit = 5, topicPageId = null) {
  await connectMongoDB();

  const prefixMap = { movie: "tmdb", tv: "tmdb", anime: "anilist", game: "rawg" };
  const prefix = prefixMap[type];
  const externalId = prefix ? `${prefix}:${relatedId}` : null;

  const baseFilter = {
    isPublic: true,
    status: "active",
    expiresAt: { $gt: new Date() },
  };

  const orClauses = [];
  if (topicPageId) {
    orClauses.push({ topicPageId: topicPageId });
  }
  if (externalId) {
    orClauses.push({ "options.catalogRef.externalId": externalId });
  }
  if (tags?.length) {
    orClauses.push({ topicType: type, topicTags: { $in: tags.slice(0, 8) } });
  }
  if (orClauses.length === 0) return [];

  const safeLimit = Math.max(1, Math.min(20, Number(limit)));
  const rows = await AskDilemma.find({ ...baseFilter, $or: orClauses })
    .select("question userId status expiresAt createdAt tags topicType topicTags isPinned finalDecision options")
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name").lean()
    : [];
  const nameById = new Map(users.map((u) => [String(u._id), u.name || "Anonymous"]));

  return rows.map((r) => serializeAsk(r, nameById));
}

/**
 * Fetch the most recent public dilemmas posted by a specific user.
 * Used on the unified profile activity timeline.
 */
export async function getAsksForUser(userId, limit = 20) {
  if (!userId) return [];
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit)));

  const rows = await AskDilemma.find({ userId: String(userId), isPublic: true })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  if (rows.length === 0) return [];

  const dummyMap = new Map([[String(userId), ""]]);
  return rows.map((r) => serializeAsk(r, dummyMap));
}
