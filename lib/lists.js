import { cache } from "react";
import { unstable_cache } from "next/cache";
import mongoose from "mongoose";
import { connectMongoDB } from "@lib/mongodb";
import UnifiedList from "@models/unifiedlist";

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
 * Public paginated feed of lists. Cached per-request via React.cache().
 * Excludes system lists (like "Saved") and private lists.
 * Only returns public, user-created custom lists.
 */
export const getPublicLists = cache(async ({ limit = 20, skip = 0 } = {}) => {
  await connectMongoDB();
  const lists = await UnifiedList.aggregate([
    {
      $match: {
        isSystem: { $ne: true },
        $or: [
          { "settings.visibility": "public" },
          { isPublic: true }  // ← backward compat for legacy public lists
        ]
      }
    },
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
    { $project: PUBLIC_LIST_PROJECTION },
  ]);
  return lists.map(formatPublicList);
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
  if (!list) return null;

  return {
    id: list._id.toString(),
    name: list.name,
    userId: list.userId?.toString(),
    description: list.description,
    isSystem: list.isSystem || false,
    systemKey: list.systemKey || null,
    settings: list.settings || {},
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
