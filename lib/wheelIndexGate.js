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
 * Pure evaluation function for wheels.
 *
 * Criteria:
 * 1. Must be public and not deleted.
 * 2. Title length >= 8 characters and clean of adult/spam keywords.
 * 3. Must have at least 6 segments (wheels with 2-3 segments are typically coin-flips or trivial tests).
 * 4. Satisfies at least one pathway:
 *    - Pathway A (Curated Editorial):
 *        - Description length >= 60 characters
 *        - Title is specific (not generic like "my wheel" or "spin wheel")
 *    - Pathway B (Social Validation):
 *        - likeCount + commentCount >= 2 and segments >= 6
 */
export function evaluateWheelQuality(wheel) {
  if (!wheel) return false;
  if (!wheel.isPublic || wheel.isDeleted) return false;

  const title = (wheel.title || "").trim();
  if (title.length < 8) return false;
  if (!isCleanText(title)) return false;

  const desc = (wheel.description || "").trim();
  if (desc && !isCleanText(desc)) return false;

  const segments = Array.isArray(wheel.data) ? wheel.data : [];
  if (segments.length < 6) return false;

  const likes = typeof wheel.likeCount === "number" ? wheel.likeCount : 0;
  const comments = typeof wheel.commentCount === "number" ? wheel.commentCount : 0;
  const totalEngagement = likes + comments;

  // Pathway A: Detailed description (>= 60 chars) + non-generic title
  if (desc.length >= 60 && !isGenericTitle(title)) return true;

  // Pathway B: Social proof engagement >= 2
  if (totalEngagement >= 2 && segments.length >= 6) return true;

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
