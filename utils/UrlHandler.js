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
 * Pattern: /lists/[id]/[slug]
 */
export function getListUrl(list) {
  if (!list) return "#";
  const id = list._id?.toString() || list.id?.toString();
  if (!id) return "#";
  
  const slug = list.slug || "";
  return slug ? `/lists/${id}/${slug}` : `/lists/${id}`;
}

/**
 * Unified URL Generator for Posts
 * Pattern: /post/[id]/[slug]
 */
export function getPostUrl(post) {
  if (!post) return "#";
  const id = post._id?.toString() || post.id?.toString();
  if (!id) return "#";

  const slug = post.slug || "";
  return slug ? `/post/${id}/${slug}` : `/post/${id}`;
}
