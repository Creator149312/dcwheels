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
 * Evaluates whether a Wheel entity has sufficient content depth for AdSense.
 * Requires:
 * - not deleted
 * - isPublic (default true)
 * - at least 4 segments/options (Google classifies <=2 options as thin template / unfinished)
 *
 * @param {object} wheel
 * @returns {boolean}
 */
export function isWheelAdEligible(wheel) {
  if (!wheel || typeof wheel !== "object") return false;
  if (wheel.isDeleted) return false;
  if (wheel.isPublic === false) return false;

  // Wheel slices/data check
  const segments = Array.isArray(wheel.data)
    ? wheel.data
    : Array.isArray(wheel.words)
    ? wheel.words
    : [];

  // Minimum 4 segments to be considered a functional, valuable spin wheel
  return segments.length >= 4;
}

/**
 * Evaluates whether a List entity has sufficient content depth for AdSense.
 * Requires:
 * - not deleted
 * - isPublic (default true)
 * - at least 4 items
 *
 * @param {object} list
 * @returns {boolean}
 */
export function isListAdEligible(list) {
  if (!list || typeof list !== "object") return false;
  if (list.isDeleted) return false;
  if (list.isPublic === false) return false;

  const items = Array.isArray(list.items) ? list.items : [];
  return items.length >= 4;
}

/**
 * Evaluates whether a Post entity has sufficient content depth for AdSense.
 * Requires:
 * - not deleted
 * - isPublic (default true)
 * - content length >= 20 characters OR poll options >= 2 OR contains an image
 *
 * @param {object} post
 * @returns {boolean}
 */
export function isPostAdEligible(post) {
  if (!post || typeof post !== "object") return false;
  if (post.isDeleted) return false;
  if (post.isPublic === false) return false;

  const contentLen = (post.content || post.text || post.title || "").trim().length;
  const hasPoll = Array.isArray(post.pollOptions) && post.pollOptions.length >= 2;
  const hasImage = Boolean(post.image || (Array.isArray(post.images) && post.images.length > 0));

  // Must have substantive discussion, a poll, or media
  return contentLen >= 20 || hasPoll || hasImage;
}
