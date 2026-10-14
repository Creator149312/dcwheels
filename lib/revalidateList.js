import { revalidateTag, revalidatePath } from "next/cache";

/**
 * Robustly busts all cache layers for a list:
 * - `list-${id}`
 * - `list-${slug}` (if slug provided or resolved)
 * - `/lists/${id}` path
 * - `/lists/${slug}` path (if provided)
 * - `profile-${userId}` (if userId provided)
 */
export function revalidateListCache({ id, slug = null, userId = null }) {
  if (id) {
    try {
      revalidateTag(`list-${id}`);
      revalidatePath(`/lists/${id}`);
    } catch (e) {
      // In case called outside request context
    }
  }

  if (slug) {
    try {
      revalidateTag(`list-${slug}`);
      revalidatePath(`/lists/${slug}`);
    } catch (e) {}
  }

  if (userId) {
    try {
      revalidateTag(`profile-${userId}`);
    } catch (e) {}
  }
}
