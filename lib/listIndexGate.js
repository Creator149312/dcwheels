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
 * Checks for repetitive character/word spam (e.g. "aaaaaaa..." or "test test test").
 * Ensures text has at least `minDistinctWords` distinct words.
 */
function hasDistinctContent(text, minDistinctWords = 2) {
  if (!text || typeof text !== "string") return false;
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  const uniqueWords = new Set(words);
  return uniqueWords.size >= minDistinctWords;
}

/**
 * Pure evaluation function — scores a list document for search engine indexability.
 *
 * GOAL: Prevent Google Thin/Helpful Content penalties across dynamic list pages.
 *
 * BASELINE QUALITY GATES (Must satisfy all):
 * 1. Accessibility: Must be public (`isPublic: true`), active (`!isDeleted`), non-system.
 * 2. Title Quality:
 *    - Length >= 10 characters.
 *    - Non-generic (rejects patterns like "my list", "favorites", "test", "watchlist").
 *    - Clean of adult/spam keywords (`isCleanText`).
 *    - Substance: At least 2 distinct words.
 * 3. Item Count & Uniqueness:
 *    - At least 5 items minimum (aligns with standard editorial listicles).
 *    - At least 4 unique item names (eliminates spam duplicates).
 * 4. Visual Media / Richness Requirement:
 *    - Either at least 80% of items have cover images / visual metadata (`image` or `wordData`),
 *    - OR, if it's a pure text/word list without images, it must provide deep textual value
 *      (Description >= 80 characters and Total Content Length >= 200 characters).
 * 5. Content Safety:
 *    - Description free of adult/spam keywords.
 *
 * INDEXATION PATHWAYS (Must qualify under at least one):
 * - PATHWAY A (Original Editorial Synopsis & Content):
 *     - Evaluates complete on-page text:
 *       Total Content Length = Description Length + Length of all Unique Items Text.
 *     - Total Content Length >= 120 characters.
 *     - Description Context Guard: Description length >= 15 characters (prevents empty synopses).
 *     - Fork Exclusion: Remixed/forked lists inherit content and can NOT qualify via Pathway A
 *       (prevents indexing duplicate content across users).
 *
 * - PATHWAY B (Social Proof / Community Validation):
 *     - `likeCount + commentCount >= 3` (or >= 2 if items >= 15 for deep roster catalogs).
 *     - Allows forks or shorter lists to be indexed once validated by community engagement.
 */
export function evaluateListQuality(list) {
  if (!list) return false;
  if (!list.isPublic || list.isDeleted || list.isSystem) return false;

  // Title validation
  const title = (list.name || list.title || "").trim();
  if (title.length < 10) return false;
  if (isGenericTitle(title)) return false;
  if (!isCleanText(title)) return false;
  if (!hasDistinctContent(title, 2)) return false;

  // Description clean & spam check
  const desc = (list.description || "").trim();
  if (desc && !isCleanText(desc)) return false;
  if (desc && !hasDistinctContent(desc, 3)) return false;

  // Items validation: Enforce >= 5 items minimum
  const items = Array.isArray(list.items) ? list.items : [];
  if (items.length < 5) return false;

  // Visual richness & Item text extraction
  const uniqueItemTexts = new Set();
  let uniqueItemsTextLength = 0;
  let withImages = 0;

  for (const it of items) {
    if (!it) continue;

    if (it.image || (it.wordData && it.wordData.length > 0)) {
      withImages++;
    }

    let text = "";
    if (typeof it === "string") {
      text = it;
    } else if (typeof it === "object") {
      text = it.name || it.word || it.title || "";
    }

    if (typeof text === "string") {
      const cleanText = text.trim();
      if (cleanText.length > 0 && !uniqueItemTexts.has(cleanText.toLowerCase())) {
        uniqueItemTexts.add(cleanText.toLowerCase());
        uniqueItemsTextLength += cleanText.length;
      }
    }
  }

  // Reject lists with heavy duplicate items
  if (uniqueItemTexts.size < 4) return false;

  const totalContentLength = desc.length + uniqueItemsTextLength;
  const visualRatio = withImages / items.length;

  // Visual richness requirement:
  // Either >= 80% items have images, OR if pure text, must provide substantial textual depth
  const isVisuallyRich = visualRatio >= 0.8;
  const isDeepTextList = visualRatio < 0.8 && desc.length >= 80 && totalContentLength >= 200;
  if (!isVisuallyRich && !isDeepTextList) return false;

  // Social proof signals
  const likes = typeof list.likeCount === "number" ? list.likeCount : 0;
  const comments = typeof list.commentCount === "number" ? list.commentCount : 0;
  const totalEngagement = likes + comments;

  // ---------------------------------------------------------------------------
  // Canonical Fork Filter (The Duplicate Remix Guard):
  // When a user remixes/forks a list, prevent duplicate clones from indexing.
  // Rule 1 (The Originality Rule): Must modify >= 30% of original items (diffRatio >= 0.30).
  // Rule 2 (The Popularity Override): Viral breakout (likes + comments >= 50) overrides.
  // ---------------------------------------------------------------------------
  const isFork = !!(list.forkedFrom && (list.forkedFrom.listId || list.forkedFrom._id));
  const diffRatio = typeof list.diffRatio === "number" ? list.diffRatio : 0;
  const isOriginalDerivative = isFork && diffRatio >= 0.30;
  const isViral = totalEngagement >= 50;

  if (isFork && !isOriginalDerivative && !isViral) {
    return false; // Stays unindexed to prevent near-duplicate SEO cannibalization
  }

  // Pathway A: High editorial quality with descriptive synopsis & items text (>= 200 chars)
  // Requires at least 30 chars description context (or >= 12 items roster).
  // Non-forks OR substantially modified forks (>= 30% original items) qualify.
  if ((!isFork || isOriginalDerivative) && totalContentLength >= 200) {
    const hasContextualDesc = desc.length >= 30;
    const isLargeCatalogList = uniqueItemTexts.size >= 12;
    if (hasContextualDesc || isLargeCatalogList) {
      return true;
    }
  }

  // Pathway B: Social proof — community has validated the list with engagement
  // For un-modified forks (< 30% diff), requires viral threshold (>= 50 engagement)
  // For standard original lists, requires standard social threshold (>= 3 engagement, or 2 on >= 15 items)
  if (isFork && !isOriginalDerivative) {
    return isViral;
  }

  if (totalEngagement >= 3) return true;
  if (totalEngagement >= 2 && items.length >= 15) return true;

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
