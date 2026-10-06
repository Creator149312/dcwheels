/**
 * Shared Atlas Search + regex helpers for TopicPage queries.
 *
 * These functions are used by search, autocomplete, and mixed suggest
 * endpoints so the index name, fuzzy config, and response shape stay
 * consistent across the app.
 */

import { isTopicDocSafe } from "@/lib/contentSafety";

const ATLAS_INDEX = "default";
const AUTOCOMPLETE_LIMIT = 10;

/**
 * Run an Atlas Search autocomplete query against topicpages.title.default.
 */
export async function runTopicAtlasSearch(model, q, limit = AUTOCOMPLETE_LIMIT, projection = {}) {
  const docs = await model.aggregate([
    {
      $search: {
        index: ATLAS_INDEX,
        autocomplete: {
          query: q,
          path: "title.default",
          tokenOrder: "any",
          fuzzy: { maxEdits: 1, prefixLength: 2 },
        },
      },
    },
    { $limit: limit * 2 },
    { $project: { type: 1, relatedId: 1, slug: 1, title: 1, cover: 1, tags: 1, description: 1, ...projection } },
  ]);

  return (docs ?? []).filter(isTopicDocSafe).slice(0, limit);
}

/**
 * Regex fallback for topic titles and slug. Escapes special regex chars.
 */
export async function runTopicRegexSearch(model, q, limit = AUTOCOMPLETE_LIMIT, projection = {}) {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  const docs = await model
    .find({
      $or: [
        { "title.default": { $regex: regex } },
        { "title.english": { $regex: regex } },
        { "title.romaji": { $regex: regex } },
        { "title.localized": { $regex: regex } },
        { "title.original": { $regex: regex } },
        { slug: { $regex: regex } },
      ],
    })
    .limit(limit * 2)
    .select({ type: 1, relatedId: 1, slug: 1, title: 1, cover: 1, tags: 1, description: 1, ...projection })
    .lean();

  return (docs ?? []).filter(isTopicDocSafe).slice(0, limit);
}

/**
 * Normalize a TopicPage doc into a consistent suggestion/search result shape.
 */
export function formatTopic(t) {
  return {
    id: String(t.relatedId ?? t._id),
    _id: String(t._id),
    type: t.type,
    slug: t.slug,
    title:
      t.title?.default ||
      t.title?.english ||
      t.title?.romaji ||
      t.title?.original ||
      t.title?.localized ||
      t.slug,
    cover: t.cover,
  };
}
