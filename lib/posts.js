import { connectMongoDB } from "@lib/mongodb";
import Post from "@models/post";
import User from "@models/user";

/**
 * Fetch paginated public posts for the feed
 */
export async function getPublicPosts({ limit = 20, skip = 0, tag, hasPoll = false } = {}) {
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit)));
  const safeSkip = Math.max(0, Number(skip));

  const query = {
    isPublic: true,
    isDeleted: false,
    shadowBanned: false,
  };
  if (tag && typeof tag === "string") {
    query.tags = tag.toLowerCase().trim();
  }
  if (hasPoll) {
    query.hasPoll = true;
  }

  const rows = await Post.find(query)
    .sort({ createdAt: -1 })
    .skip(safeSkip)
    .limit(safeLimit)
    .lean();

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name username").lean()
    : [];

  const nameById = new Map(users.map((u) => [String(u._id), u.name || "Anonymous"]));
  const handleById = new Map(users.map((u) => [String(u._id), u.username || null]));

  return rows.map((r) => serializePost(r, nameById, handleById));
}

/**
 * Fetch all posts by a specific user
 */
export async function getPostsForUser(userId, limit = 20, includePrivate = false) {
  if (!userId) return [];
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit)));

  const query = { userId: String(userId), isDeleted: false };
  if (!includePrivate) {
    query.isPublic = true;
  }

  const rows = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  const user = await User.findById(userId).select("name username").lean();
  const nameById = new Map([[String(userId), user?.name || "Anonymous"]]);
  const handleById = new Map([[String(userId), user?.username || null]]);

  return rows.map((r) => serializePost(r, nameById, handleById));
}

/**
 * Fetch a single post by ID
 */
export async function getPostById(id) {
  await connectMongoDB();

  const row = await Post.findById(id).lean();
  if (!row) return null;

  const user = await User.findById(row.userId).select("name username").lean();
  const nameById = new Map([[String(row.userId), user?.name || "Anonymous"]]);
  const handleById = new Map([[String(row.userId), user?.username || null]]);

  return serializePost(row, nameById, handleById);
}

/**
 * Fetch posts related to a specific content entity
 * Used on content pages like /anime/[slug], /movie/[slug]
 */
export async function getPostsForEntity(type, externalId, limit = 10) {
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit)));

  const rows = await Post.find({
    isPublic: true,
    "contentRef.type": type,
    "contentRef.externalId": String(externalId),
  })
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .lean();

  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select("name username").lean()
    : [];

  const nameById = new Map(users.map((u) => [String(u._id), u.name || "Anonymous"]));
  const handleById = new Map(users.map((u) => [String(u._id), u.username || null]));

  return rows.map((r) => serializePost(r, nameById, handleById));
}

/**
 * Serialize a post document for API response
 */
function serializePost(row, nameById, handleById) {
  return {
    _id: String(row._id),
    id: String(row._id),
    userId: String(row.userId),
    title: row.title,
    content: row.content || "",
    image: row.image || null,
    authorName: row.authorName || nameById.get(String(row.userId)) || "Anonymous",
    authorHandle: row.authorHandle || handleById.get(String(row.userId)) || null,
    contentRef: row.contentRef
      ? {
          type: row.contentRef.type,
          externalId: row.contentRef.externalId,
          title: row.contentRef.title,
          image: row.contentRef.image,
        }
      : null,
    tags: row.tags || [],
    hasPoll: !!row.hasPoll,
    pollOptions: (row.pollOptions || []).map((opt) => ({
      _id: String(opt._id),
      id: String(opt._id),
      text: opt.text,
      voteCount: opt.voteCount || 0,
    })),
    likeCount: row.likeCount || 0,
    commentCount: row.commentCount || 0,
    isPublic: !!row.isPublic,
    ogMeta: row.ogMeta || null,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
  };
}
