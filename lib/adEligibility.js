/**
 * lib/adEligibility.js
 *
 * Centralized AdSense eligibility policy to protect against Google AdSense
 * "Valuable Inventory: No Content / Under Construction / Template" policy violations
 * without artificially choking off ad revenue from UGC, Social, or Remixed content.
 *
 * Criteria:
 * 1. Must not be deleted or shadow-banned.
 * 2. Must not be private.
 * 3. Must have meaningful content depth (not a blank/1-item placeholder test).
 * 4. Specific system/utility routes (embeds, auth, dashboard) must never load ads.
 */

import { isCleanText } from "./contentSafety.js";

const GENERIC_TITLE_PATTERNS = [
  /^wheel$/i,
  /^spin wheel$/i,
  /^spin the wheel$/i,
  /^random wheel$/i,
  /^picker wheel$/i,
  /^my wheel$/i,
  /^test(ing)?$/i,
  /^sample$/i,
  /^untitled$/i,
  /^new wheel$/i,
  /^my list$/i,
  /^new list$/i,
  /^tier list$/i,
  /^my tier list$/i,
  /^random$/i,
];

function isGenericTitle(title) {
  if (!title || typeof title !== "string") return true;
  const trimmed = title.trim();
  return GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Route patterns where ads should NEVER be displayed.
 * (Embeds, Auth screens, Admin Dashboards, System Utility pages)
 */
export const EXCLUDED_AD_PATH_PATTERNS = [
  /^\/embed\//,
  /^\/api\//,
  /^\/dashboard\//,
  /^\/login/,
  /^\/register/,
  /^\/forgot-password/,
  /^\/reset-password/,
  /^\/verify\//,
  /^\/u\/[^\/]+\/saved/, // Private saved bookmarks page
];

/**
 * Check if a path is strictly prohibited from running ads.
 * @param {string} pathname
 * @returns {boolean}
 */
export function isRouteAdEligible(pathname) {
  if (!pathname || typeof pathname !== "string") return true;
  for (const pattern of EXCLUDED_AD_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluates whether a Wheel entity has sufficient content depth and safety for AdSense.
 * Tier 2.5 Defense:
 * - not deleted, not private
 * - at least 6 segments (blocks coin-flips and thin template wheels)
 * - non-generic title with at least 8 characters
 * - title & description pass adult/hate/piracy content safety filters
 *
 * @param {object} wheel
 * @returns {boolean}
 */
export function isWheelAdEligible(wheel) {
  if (!wheel || typeof wheel !== "object") return false;
  if (wheel.isDeleted) return false;
  if (wheel.isPublic === false) return false;

  const title = (wheel.title || "").trim();
  if (title.length < 8) return false;
  if (isGenericTitle(title)) return false;
  if (!isCleanText(title)) return false;

  const desc = (wheel.description || "").trim();
  if (desc && !isCleanText(desc)) return false;

  // Wheel slices/data check: minimum 6 segments
  const segments = Array.isArray(wheel.data)
    ? wheel.data
    : Array.isArray(wheel.words)
    ? wheel.words
    : [];

  return segments.length >= 6;
}

/**
 * Evaluates whether a List entity has sufficient content depth and visual richness for AdSense.
 * Tier 2.5 Defense:
 * - not deleted, not private
 * - at least 6 items
 * - non-generic title with at least 8 characters
 * - title & description pass content safety filters
 * - at least 50% of items have visual media (cover images/thumbnails)
 *
 * @param {object} list
 * @returns {boolean}
 */
export function isListAdEligible(list) {
  if (!list || typeof list !== "object") return false;
  if (list.isDeleted) return false;
  if (list.isPublic === false) return false;

  const title = (list.name || list.title || "").trim();
  if (title.length < 8) return false;
  if (isGenericTitle(title)) return false;
  if (!isCleanText(title)) return false;

  const desc = (list.description || "").trim();
  if (desc && !isCleanText(desc)) return false;

  const items = Array.isArray(list.items) ? list.items : [];
  if (items.length < 6) return false;

  // At least 50% visual richness
  const withImages = items.filter(
    (i) => !!(i.image || (i.wordData && typeof i.wordData === "string" && i.wordData.length > 0))
  ).length;

  return withImages / items.length >= 0.5;
}

/**
 * Evaluates whether a Post entity has sufficient discussion depth and safety for AdSense.
 * Tier 2.5 Defense:
 * - not deleted, not private, not shadow-banned
 * - content passes safety filters
 * - substantive discussion (>= 120 chars) OR structured poll (>= 2 options + >= 25 chars) OR media + text (>= 40 chars)
 *
 * @param {object} post
 * @returns {boolean}
 */
export function isPostAdEligible(post) {
  if (!post || typeof post !== "object") return false;
  if (post.isDeleted) return false;
  if (post.isPublic === false) return false;
  if (post.shadowBanned) return false;

  const content = (post.content || post.text || post.title || "").trim();
  if (!content && !post.hasPoll && !post.image) return false;
  if (content && !isCleanText(content)) return false;

  const contentLen = content.length;
  const hasPoll = Array.isArray(post.pollOptions) && post.pollOptions.length >= 2;
  const hasImage = Boolean(post.image || (Array.isArray(post.images) && post.images.length > 0));

  // 1. Long-form discussion (>= 120 chars)
  if (contentLen >= 120) return true;

  // 2. Poll with context (>= 25 chars question/context)
  if (hasPoll && contentLen >= 25) return true;

  // 3. Image with substantive caption (>= 40 chars)
  if (hasImage && contentLen >= 40) return true;

  return false;
}
