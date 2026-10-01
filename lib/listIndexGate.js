/**
 * lib/listIndexGate.js
 *
 * Automated Quality Gate for List Indexing (Preventing Index Bloat).
 *
 * Google's Helpful Content System penalizes domains with excessive thin,
 * low-effort, or spam user-generated content.
 *
 * This module evaluates lists against strict content quality rules and
 * social proof engagement signals (likeCount, commentCount) before
 * allowing them to be indexed by Google and included in sitemaps.
 */

import mongoose from "mongoose";
import { isCleanText } from "./contentSafety.js";

// Generic / boilerplate titles that should never be auto-indexed
// without genuine social proof / strong community validation.
const GENERIC_TITLE_PATTERNS = [
  /^my list$/i,
  /^my tier list$/i,
  /^tier list$/i,
  /^favorites?$/i,
  /^my favorites?$/i,
  /^best movies?$/i,
  /^best anime$/i,
  /^best games?$/i,
  /^top movies?$/i,
  /^top anime$/i,
  /^top games?$/i,
  /^watchlist$/i,
  /^my watchlist$/i,
  /^untitled$/i,
  /^test(ing)?$/i,
  /^sample$/i,
  /^random$/i,
  /^new list$/i,
];

function isGenericTitle(title) {
  if (!title || typeof title !== "string") return true;
  const trimmed = title.trim();
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Pure evaluation function — scores a list document for search engine indexability.
 *
 * Must satisfy all baseline requirements:
 * 1. Public, not deleted, not system
 * 2. Title length >= 8 characters and free of adult/spam terms
 * 3. Enforces >= 7 items minimum
 * 4. At least 70% of items have cover images / visual metadata
 *
 * AND satisfies at least ONE quality/social proof pathway:
 * - Pathway A (Editorial Quality):
 *     - Description length >= 80 characters
 *     - Title is NOT a generic phrase (e.g., "my list", "favorites", "best movies")
 * - Pathway B (Social Proof / Engagement Gate):
 *     - likeCount + commentCount >= 2 and items >= 7
 */
export function evaluateListQuality(list) {
  if (!list) return false;
  if (!list.isPublic || list.isDeleted || list.isSystem) return false;

  // Title validation
  const title = (list.name || list.title || "").trim();
  if (title.length < 8) return false;
  if (!isCleanText(title)) return false;

  // Description clean check
  const desc = (list.description || "").trim();
  if (desc && !isCleanText(desc)) return false;

  // Items validation: Enforce >= 7 items minimum
  const items = Array.isArray(list.items) ? list.items : [];
  if (items.length < 7) return false;

  // Visual richness: at least 70% of items must have an image or valid thumbnail
  const withImages = items.filter(
    (i) => !!(i.image || (i.wordData && i.wordData.length > 0))
  ).length;

  if (withImages / items.length < 0.7) return false;

  // Social proof signals
  const likes = typeof list.likeCount === "number" ? list.likeCount : 0;
  const comments = typeof list.commentCount === "number" ? list.commentCount : 0;
  const totalEngagement = likes + comments;

  // Pathway A: High editorial quality with descriptive synopsis (>= 80 chars)
  // Must NOT have a purely generic title without qualifiers unless community-validated.
  if (desc.length >= 80 && !isGenericTitle(title)) return true;

  // Pathway B: Social proof — community has validated the list with engagement
  // Requires at least 2 distinct interactions (likes/comments)
  if (totalEngagement >= 2 && items.length >= 7) return true;

  return false;
}

/**
 * Synchronize the `indexed` flag on a UnifiedList document in the database.
 * Non-blocking, safe helper for API mutation routes (save, edit, like, comment).
 */
export async function syncListIndexedState(listId) {
  if (!listId) return false;

  try {
    const UnifiedList =
      mongoose.models.UnifiedList ||
      (await import("@/models/unifiedlist")).default;

    const list = await UnifiedList.findById(listId).lean();
    if (!list) return false;

    const shouldIndex = evaluateListQuality(list);

    if (list.indexed !== shouldIndex) {
      await UnifiedList.updateOne(
        { _id: listId },
        { $set: { indexed: shouldIndex } }
      );
      try {
        const { revalidateTag } = await import("next/cache");
        revalidateTag(`list-${listId}`);
      } catch {}
      return shouldIndex;
    }

    return list.indexed ?? false;
  } catch (err) {
    console.error("[listIndexGate] Failed to sync indexed state:", err.message);
    return false;
  }
}
