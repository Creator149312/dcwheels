import { cache } from "react";
import { unstable_cache } from "next/cache";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";
import User from "@models/user";

/**
 * Projection used for the public "browse all lists" feed.
 *
 * Returns a lightweight shape for each list:
 *  - itemCount via $size (no need to ship the whole items array)
 *  - firstItem (only what the grid needs to render a cover)
 *
 * This replaces the pattern of shipping the full items[] (with embedded
 * base64 wordData) just so the client could compute `.length` and pick [0].
 */
const PUBLIC_LIST_PROJECTION = {
  name: 1,
  slug: 1,
  description: 1,
  createdAt: 1,
  updatedAt: 1,
  userId: 1,
  itemCount: { $size: { $ifNull: ["$items", []] } },
  firstItem: {
    $let: {
      vars: { first: { $arrayElemAt: ["$items", 0] } },
      in: {
        type: "$$first.type",
        image: "$$first.image",
        wordData: "$$first.wordData",
        word: "$$first.word",
        name: "$$first.name",
      },
    },
  },
};

function formatPublicList(list) {
  return {
    id: list._id.toString(),
    name: list.name,
    slug: list.slug || "",
    description: list.description,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    userId: list.userId?.toString(),
    itemCount: list.itemCount ?? 0,
    // Keep the grid's existing `list.items[0]` access path working with a
    // single-element array. `items.length` callers should migrate to
    // `itemCount`, which is always authoritative.
    items: list.firstItem ? [list.firstItem] : [],
  };
}

/**
 * Decode a cursor string into { createdAt, _id } for cursor-based pagination.
 * Cursor format: "createdAtISO|_id"
 */
function decodeListCursor(cursor) {
  if (!cursor || typeof cursor !== "string" || !cursor.includes("|")) return null;
  const [cursorDate, cursorId] = cursor.split("|");
  if (!cursorDate || !cursorId || !mongoose.Types.ObjectId.isValid(cursorId)) return null;
  return { createdAt: new Date(cursorDate), _id: new mongoose.Types.ObjectId(cursorId) };
}

/**
 * Public paginated feed of lists using cursor-based pagination.
 * Excludes system lists (like "Saved") and private lists.
 * Only returns public, user-created custom lists.
 */
export const getPublicLists = cache(async ({ limit = 20, cursor = null } = {}) => {
  await connectMongoDB();

  const safeLimit = Math.max(1, Math.min(50, Number(limit)));
  const match = {
    isSystem: { $ne: true },
    isPublic: { $ne: false },
    isDeleted: { $ne: true },
  };

  const decoded = decodeListCursor(cursor);
  if (decoded) {
    match.$or = [
      { createdAt: { $lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, _id: { $lt: decoded._id } },
    ];
  }

  const lists = await UnifiedList.aggregate([
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: safeLimit + 1 },
    { $project: PUBLIC_LIST_PROJECTION },
  ]);

  const hasMore = lists.length > safeLimit;
  const pageLists = hasMore ? lists.slice(0, safeLimit) : lists;
  const posts = pageLists.map(formatPublicList);
  const last = pageLists[pageLists.length - 1];
  const nextCursor = hasMore && last
    ? `${last.createdAt.toISOString()}|${String(last._id)}`
    : null;

  return { lists: posts, nextCursor, hasMore };
});

/**
 * Single list by id — returns the full document (items included).
 * Used by both generateMetadata() and the page body; React.cache() ensures
 * only one DB round-trip per request.
 */
export const getListById = cache(async (id) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  await connectMongoDB();
  const list = await UnifiedList.findById(id).lean();
  
  if (!list || list.isDeleted) return null;

  return {
    id: list._id.toString(),
    name: list.name,
    slug: list.slug || "",
    userId: list.userId?.toString(),
    description: list.description,
    isPublic: list.isPublic ?? true,
    isSystem: list.isSystem || false,
    systemKey: list.systemKey || null,
    indexed: list.indexed ?? false,
    commentCount: list.commentCount || 0,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
    items: (list.items || []).map((item) => ({
      _id: item._id?.toString(),
      type: item.type,
      word: item.word,
      wordData: item.wordData,
      entityType: item.entityType,
      entityId: item.entityId?.toString?.() ?? item.entityId,
      name: item.name,
      slug: item.slug,
      image: item.image,
      addedAt: item.addedAt,
    })),
  };
});

/**
 * Cross-request cached version of getListById.
 * Uses Next.js Data Cache (unstable_cache) with a per-list tag so mutations
 * can bust it immediately via revalidateTag(`list-${id}`).
 * TTL: 2 minutes as a safety net if a tag bust is missed.
 *
 * Use this in page.js so the route doesn't need force-dynamic just for list
 * data — the session check is the only truly dynamic part.
 */
export function getListByIdCached(id) {
  return unstable_cache(
    () => getListById(id),
    [`list-detail-${id}`],
    { revalidate: 604800, tags: [`list-${id}`] } // 7 days — tag-busted on mutations
  )();
}

/**
 * Fetches only the ID of the specific "Saved" system list for a given username.
 * Used for routing and cache-key resolution.
 */
export const getSavedListIdByUsername = cache(async (username) => {
  if (!username) return null;
  await connectMongoDB();
  
  const user = await User.findOne({ username: username.toLowerCase() }).select("_id").lean();
  if (!user) return null;

  const list = await UnifiedList.findOne({ 
    userId: user._id, 
    systemKey: "SYS_SAVED",
    isDeleted: { $ne: true }
  }).select("_id").lean();
  
  return list?._id?.toString() || null;
});

/**
 * Fetches the specific "Saved" system list for a given username.
 * Reuses getListByIdCached for efficient tag-based revalidation.
 */
export async function getSavedListCached(username) {
  const listId = await getSavedListIdByUsername(username);
  if (!listId) return null;
  
  return getListByIdCached(listId);
}
