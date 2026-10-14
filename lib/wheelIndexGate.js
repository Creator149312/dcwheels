/**
 * lib/wheelIndexGate.js
 *
 * Automated Quality Gate for Wheel Indexing (Protecting Search Crawl Budget).
 *
 * Evaluates whether a Wheel document satisfies quality criteria before being
 * indexed by Googlebot and exposed in /wheels/sitemap.xml.
 */

import mongoose from "mongoose";
import { isCleanText } from "./contentSafety.js";

const GENERIC_TITLE_PATTERNS = [
  /^wheel$/i,
  /^spin wheel$/i,
  /^spin the wheel$/i,
  /^random wheel$/i,
  /^picker wheel$/i,
  /^my wheel$/i,
  /^test$/i,
  /^testing$/i,
  /^sample$/i,
  /^untitled$/i,
  /^new wheel$/i,
  /^decision wheel$/i,
  /^yes or no$/i,
  /^custom wheel$/i,
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
 * Pure evaluation function for wheels.
 *
 * GOAL: Protect Google Search crawl budget and Helpful Content rankings by ensuring
 * only substantial, non-spam wheels get indexed.
 *
 * BASELINE QUALITY GATES (Must satisfy all):
 * 1. Accessibility: Must be public (`isPublic: true`) and active (`!isDeleted`).
 * 2. Title Quality:
 *    - Length >= 10 characters.
 *    - Non-generic (rejects patterns like "wheel", "spin wheel", "test", "yes or no").
 *    - Clean of adult/spam keywords (`isCleanText`).
 *    - Substance: At least 2 distinct words (rejects single-token spam like "AAAAAAAAAA").
 * 3. Segment Volume & Variety:
 *    - At least 5 total segments (eliminates binary coin-flips and test templates).
 *    - At least 4 unique segment labels (prevents duplicate spam inflating lengths).
 * 4. Content Safety:
 *    - Description free of adult/spam keywords.
 *
 * INDEXATION PATHWAYS (Must qualify under at least one):
 * - PATHWAY A (Editorial / On-page Text Depth):
 *     - Evaluates the total user-facing textual content rendered on the page:
 *       Total Content Length = Description Length + Length of all Unique Segments Text.
 *     - Total Content Length >= 120 characters.
 *     - Minimum Context Guard: Requires either:
 *         a) A meaningful description of at least 15 characters, OR
 *         b) An extensive wheel with at least 8 unique segments if description is brief.
 *       (Prevents empty descriptions with trivial 1-word segments from sneaking in).
 *
 * - PATHWAY B (Social Proof / Community Validation):
 *     - Engagement proof: `likeCount + commentCount >= 3`.
 *     - Allows shorter, viral community wheels to get indexed once validated by real users.
 */
export function evaluateWheelQuality(wheel) {
  if (!wheel) return false;
  if (!wheel.isPublic || wheel.isDeleted) return false;

  const title = (wheel.title || "").trim();
  if (title.length < 10) return false;
  if (isGenericTitle(title)) return false;
  if (!isCleanText(title)) return false;
  if (!hasDistinctContent(title, 2)) return false;

  const desc = (wheel.description || "").trim();
  if (desc && !isCleanText(desc)) return false;
  if (desc && !hasDistinctContent(desc, 3)) return false;

  const segments = Array.isArray(wheel.data) ? wheel.data : [];
  if (segments.length < 5) return false;

  // Extract and clean unique segment texts (prevents repeated option spam inflating count)
  const uniqueSegmentTexts = new Set();
  let uniqueSegmentsTextLength = 0;

  for (const seg of segments) {
    if (!seg) continue;
    let segText = "";
    if (typeof seg === "string") {
      segText = seg;
    } else if (typeof seg === "object") {
      segText = seg.text || seg.label || seg.word || "";
    }
    // Strip HTML tags if present (e.g. legacy embedded <img ...> tags)
    if (typeof segText === "string" && segText.length > 0) {
      const cleanSegText = segText.replace(/<[^>]+>/g, "").trim();
      if (cleanSegText.length > 0 && !uniqueSegmentTexts.has(cleanSegText.toLowerCase())) {
        uniqueSegmentTexts.add(cleanSegText.toLowerCase());
        uniqueSegmentsTextLength += cleanSegText.length;
      }
    }
  }

  // Reject wheels with heavy duplicate/monotonous segments (e.g. 5x "Option")
  if (uniqueSegmentTexts.size < 4) return false;

  const totalContentLength = desc.length + uniqueSegmentsTextLength;

  const likes = typeof wheel.likeCount === "number" ? wheel.likeCount : 0;
  const comments = typeof wheel.commentCount === "number" ? wheel.commentCount : 0;
  const totalEngagement = likes + comments;

  // ---------------------------------------------------------------------------
  // Canonical Fork Filter (The Duplicate Remix Guard):
  // When a user remixes/forks a wheel, prevent duplicate clones from indexing.
  // Rule 1 (The Originality Rule): Must modify >= 30% of original slices (diffRatio >= 0.30).
  // Rule 2 (The Popularity Override): Viral breakout (likes + comments >= 50) overrides.
  // ---------------------------------------------------------------------------
  const isFork = !!(wheel.forkedFrom && (wheel.forkedFrom.wheelId || wheel.forkedFrom._id));
  if (isFork) {
    const diffRatio = typeof wheel.diffRatio === "number" ? wheel.diffRatio : 0;
    const isOriginalDerivative = diffRatio >= 0.30;
    const isViral = totalEngagement >= 50;

    if (!isOriginalDerivative && !isViral) {
      return false; // Stays unindexed to protect Google crawl budget
    }
  }

  // Pathway A: Editorial / On-page Text Depth
  // Requires >= 200 total characters AND either a 30-char description or >= 12 unique segments
  if (totalContentLength >= 200) {
    const hasContextualDesc = desc.length >= 30;
    const isLargeCatalogWheel = uniqueSegmentTexts.size >= 12;
    if (hasContextualDesc || isLargeCatalogWheel) {
      return true;
    }
  }

  // Pathway B: Social Validation (>= 3 engagement: likes + comments)
  if (totalEngagement >= 3) return true;

  return false;
}

/**
 * Synchronize the `indexed` flag on a Wheel document in the database.
 */
export async function syncWheelIndexedState(wheelId) {
  if (!wheelId) return false;

  try {
    const Wheel =
      mongoose.models.Wheel ||
      (await import("@/models/wheel")).default;

    const wheel = await Wheel.findById(wheelId).lean();
    if (!wheel) return false;

    // Admin verified wheels are always preserved as indexed
    if (wheel.isVerified) {
      if (!wheel.indexed) {
        await Wheel.updateOne({ _id: wheelId }, { $set: { indexed: true } });
      }
      return true;
    }

    const shouldIndex = evaluateWheelQuality(wheel);

    if (wheel.indexed !== shouldIndex) {
      await Wheel.updateOne(
        { _id: wheelId },
        { $set: { indexed: shouldIndex } }
      );
      try {
        const { revalidateTag, revalidatePath } = await import("next/cache");
        revalidateTag(`wheel-${wheelId}`);
        if (wheel.slug) {
          revalidatePath(`/wheels/${wheel.slug}`);
        }
        revalidatePath(`/wheels/${wheelId}`);
      } catch {}
      return shouldIndex;
    }

    return wheel.indexed ?? false;
  } catch (err) {
    console.error("[wheelIndexGate] Failed to sync indexed state:", err.message);
    return false;
  }
}
