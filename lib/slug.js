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
 * Tag normalizer — converts camelCase, PascalCase, or hashtagged phrases
 * (e.g. "#LoveIsWhatILike", "SuperMarioBros", "horror_movies")
 * into canonical lowercase kebab-case (e.g. "love-is-what-i-like", "super-mario-bros", "horror-movies").
 */
export function normalizeTag(input) {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/^#+/, "") // strip leading hashtags
    // Split camelCase and PascalCase boundaries: "LoveIsWhatILike" -> "Love Is What I Like"
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[\s_]+/g, "-") // spaces & underscores -> hyphens
    .replace(/[^a-z0-9-]/g, "") // strip punctuation & non-URL chars
    .replace(/-+/g, "-") // collapse repeated hyphens
    .replace(/(^-|-$)/g, ""); // trim leading/trailing hyphens
}
