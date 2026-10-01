/**
 * Unified URL Generator for Wheels
 * Tiered Strategy:
 * 1. Admin/SEO: /wheels/[slug]
 * 2. User/Community (Compound): /wheels/[slug]-[id] (stored in wheel.slug)
 * 3. Fallback: /wheels/[id]
 */
export function getWheelUrl(wheel) {
  if (!wheel) return "#";
  
  // Rule 1: Use slug if present (both pure admin slugs and user compound slugs)
  if (wheel.slug) {
    return `/wheels/${wheel.slug}`;
  }

  // Rule 2: Fallback to ObjectId for legacy user wheels without slug
  const id = wheel._id?.toString() || wheel.id?.toString();
  return id ? `/wheels/${id}` : "#";
}

/**
 * Unified URL Generator for Lists
 * Pattern: /lists/[slug]
 * Uses the list slug entry from the DB (with ID fallback if no slug exists).
 */
export function getListUrl(list) {
  if (!list) return "#";
  const slug = list.slug || "";
  if (slug) return `/lists/${slug}`;

  const id = list._id?.toString?.() || list.id?.toString?.();
  return id ? `/lists/${id}` : "#";
}

/**
 * Generate an immutable, ASCII-clean slug from a list name.
 * Transliterates non-Latin scripts (Chinese, Japanese, Cyrillic, Arabic, etc.)
 * into URL-safe Latin characters. Falls back to id-only if the title contains
 * only emojis or unmapped symbols.
 *
 * The transliteration package is imported dynamically so it is only loaded
 * during list creation, keeping serverless cold starts lean.
 */
export async function createImmutableGlobalSlug({ title, id, maxLength = 40 }) {
  if (!title || !title.trim() || !id) return id;

  const { slugify: transliterateSlug } = await import("transliteration");

  let cleanSlug = transliterateSlug(title, {
    lowercase: true,
    separator: "-",
    trim: true,
  });

  // Collapse repeated hyphens
  cleanSlug = cleanSlug.replace(/-+/g, "-");

  // Cap length on a word boundary
  if (cleanSlug.length > maxLength) {
    cleanSlug = cleanSlug.slice(0, maxLength).replace(/-[^-]*$/, "");
  }

  // Trim leading/trailing hyphens
  cleanSlug = cleanSlug.replace(/^-+|-+$/g, "");

  // Fallback: emoji-only or symbol-only titles
  if (!cleanSlug) return id;

  return `${cleanSlug}-${id}`;
}

/**
 * Parse a /lists/[slug]-[id] path segment.
 * Also supports legacy /lists/[id]-[slug] and bare /lists/[id].
 * Returns { id, slug, malformed }.
 */
export function parseListSlugId(segment) {
  if (!segment) return { id: "", slug: null, malformed: true };

  const objectIdRegex = /^[0-9a-fA-F]{24}$/;

  // Bare id: /lists/[id]
  if (objectIdRegex.test(segment)) {
    return { id: segment.toLowerCase(), slug: null, malformed: false };
  }

  // Canonical format: /lists/[slug]-[id]  (id at the end)
  const canonicalMatch = segment.match(/^(.+)-([0-9a-fA-F]{24})$/);
  if (canonicalMatch) {
    return {
      id: canonicalMatch[2].toLowerCase(),
      slug: canonicalMatch[1] || null,
      malformed: false,
    };
  }

  // Legacy format: /lists/[id]-[slug]  (id at the start)
  const legacyMatch = segment.match(/^([0-9a-fA-F]{24})-(.+)$/);
  if (legacyMatch) {
    return {
      id: legacyMatch[1].toLowerCase(),
      slug: legacyMatch[2] || null,
      malformed: false,
    };
  }

  return { id: "", slug: null, malformed: true };
}

/**
 * Parse a /wheels/[slug] or /wheels/[slug]-[id] path segment.
 * Supports:
 *   - Canonical compound format: /wheels/[slug]-[id] (24-char ObjectId at tail)
 *   - Bare ObjectId: /wheels/[id]
 *   - Admin / Pure SEO slug: /wheels/[slug] (e.g. "yes-or-no-wheel")
 * Returns { id: string | null, slug: string, isCompound: boolean, isPureId: boolean }.
 */
export function parseWheelSlugId(segment) {
  if (!segment || typeof segment !== "string") {
    return { id: null, slug: "", isCompound: false, isPureId: false };
  }

  const trimmed = segment.trim();
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;

  // 1. Bare ObjectId: /wheels/[id]
  if (objectIdRegex.test(trimmed)) {
    return {
      id: trimmed.toLowerCase(),
      slug: trimmed,
      isCompound: false,
      isPureId: true,
    };
  }

  // 2. Canonical Compound: /wheels/[slug]-[id] (trailing 24-char hex)
  const compoundMatch = trimmed.match(/^(.+)-([0-9a-fA-F]{24})$/);
  if (compoundMatch) {
    return {
      id: compoundMatch[2].toLowerCase(),
      slug: trimmed,
      isCompound: true,
      isPureId: false,
    };
  }

  // 3. Admin / Pure SEO Slug: /wheels/[slug]
  return {
    id: null,
    slug: trimmed,
    isCompound: false,
    isPureId: false,
  };
}

/**
 * Unified URL Generator for Posts
 * Pattern: /posts/[id] (ID-only, like Threads/Twitter)
 * The slug is intentionally not used; IDs are the stable lookup key.
 */
export function getPostUrl(post) {
  if (!post) return "#";
  const id = post._id?.toString() || post.id?.toString();
  return id ? `/posts/${id}` : "#";
}
