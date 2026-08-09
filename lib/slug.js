/**
 * URL-safe slug generation.
 *
 * Centralized here so wheels, pages, lists, and tags all use the same rules.
 */
export function slugify(input) {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Tag normalizer — tags are lowercased, hyphenated, and stripped of
 * non-alphanumeric characters (except hyphens).
 */
export function normalizeTag(input) {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}
