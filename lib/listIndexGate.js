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

const ADULT_TERMS = [
  "sex",
  "porn",
  "nude",
  "erotic",
  "xxx",
  "fetish",
  "bdsm",
  "naked",
  "boobs",
  "butt",
  "vagina",
  "penis",
  "dildo",
  "orgasm",
  "hentai",
  "anal",
  "cum",
  "intercourse",
  "masturbation",
  "position",
  "sex-position",
];

function isCleanText(text) {
  if (!text || typeof text !== "string") return true;
  const lower = text.toLowerCase();
  return !ADULT_TERMS.some((term) => lower.includes(term));
}

/**
 * Pure evaluation function — scores a list document for search engine indexability.
 *
 * Must satisfy all baseline requirements:
 * 1. Public, not deleted, not system
 * 2. Title length >= 8 characters and free of adult/spam terms
 * 3. Has at least 5 items
 * 4. At least 70% of items have cover images / visual metadata
 *
 * AND satisfies at least ONE quality/social proof pathway:
 * - Pathway A (Editorial Quality): Description length >= 50 characters
 * - Pathway B (Social Proof / Engagement Gate): likeCount + commentCount >= 1 and items >= 6
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

  // Items validation
  const items = Array.isArray(list.items) ? list.items : [];
  if (items.length < 5) return false;

  // Visual richness: at least 70% of items must have an image or valid thumbnail
  const withImages = items.filter(
    (i) => !!(i.image || (i.wordData && i.wordData.length > 0))
  ).length;

  if (withImages / items.length < 0.7) return false;

  // Social proof signals
  const likes = typeof list.likeCount === "number" ? list.likeCount : 0;
  const comments = typeof list.commentCount === "number" ? list.commentCount : 0;
  const totalEngagement = likes + comments;

  // Pathway A: High editorial quality with descriptive synopsis
  if (desc.length >= 50) return true;

  // Pathway B: Social proof — community has validated the list with likes or comments
  if (totalEngagement >= 1 && items.length >= 6) return true;

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
