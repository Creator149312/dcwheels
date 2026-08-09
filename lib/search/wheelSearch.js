/**
 * Shared Atlas Search + regex helpers for Wheel queries.
 */

import { getWheelUrl } from "@utils/UrlHandler";

const ATLAS_INDEX = "default";
const DEFAULT_LIMIT = 10;

/**
 * Run an Atlas Search autocomplete query against wheels.title.
 */
export async function runWheelAtlasSearch(model, q, limit = DEFAULT_LIMIT, projection = {}) {
  const docs = await model.aggregate([
    {
      $search: {
        index: ATLAS_INDEX,
        autocomplete: {
          query: q,
          path: "title",
          tokenOrder: "any",
          fuzzy: { maxEdits: 1, prefixLength: 2 },
        },
      },
    },
    { $limit: limit },
    { $project: { title: 1, slug: 1, ...projection } },
  ]);

  return docs ?? [];
}

/**
 * Regex fallback for wheel titles. Excludes soft-deleted wheels by default.
 */
export async function runWheelRegexSearch(model, q, limit = DEFAULT_LIMIT, projection = {}) {
  const docs = await model
    .find({
      title: { $regex: new RegExp(q, "i") },
      isDeleted: { $ne: true },
    })
    .limit(limit)
    .select({ title: 1, slug: 1, ...projection })
    .lean();

  return docs;
}

/**
 * Normalize a Wheel doc into a consistent suggestion/search result shape.
 */
export function formatWheel(w) {
  return {
    id: String(w._id),
    title: w.title,
    type: "wheel",
    slug: w.slug,
    route: getWheelUrl(w),
  };
}
