/**
 * Unified URL Generator for Wheels
 * Tiered Strategy:
 * 1. Admin/SEO: /wheels/[slug]
 * 2. User/Community: /wheels/[id]
 */
export function getWheelUrl(wheel) {
  if (!wheel) return "#";
  
  // Rule 1: Use slug for Admin/SEO wheels
  if (wheel.slug) {
    return `/wheels/${wheel.slug}`;
  }

  // Rule 2: Use ObjectId for User wheels
  const id = wheel._id?.toString() || wheel.id?.toString();
  return id ? `/wheels/${id}` : "#";
}

/**
 * Unified URL Generator for Lists
 * Pattern: /lists/[id]-[slug]
 * The slug is generated once from the list name and never changes.
 * ID is the authoritative lookup key; slug is decorative + SEO.
 */
export function getListUrl(list) {
  if (!list) return "#";
  const id = list._id?.toString?.() || list.id?.toString?.();
  if (!id) return "#";

  const slug = list.slug || "";
  return slug ? `/lists/${id}-${slug}` : `/lists/${id}`;
}

/**
 * Parse a combined /lists/[id]-[slug] segment.
 * Returns { id, slug }. Falls back to treating the whole segment as id.
 */
export function parseListUrlSegment(segment) {
  if (!segment) return { id: "", slug: null };
  const idx = segment.indexOf("-");
  if (idx === -1) return { id: segment, slug: null };
  return { id: segment.slice(0, idx), slug: segment.slice(idx + 1) || null };
}

/**
 * Unified URL Generator for Posts
 * Pattern: /post/[id] (ID-only, like Threads/Twitter)
 * The slug is intentionally not used; IDs are the stable lookup key.
 */
export function getPostUrl(post) {
  if (!post) return "#";
  const id = post._id?.toString() || post.id?.toString();
  return id ? `/post/${id}` : "#";
}
