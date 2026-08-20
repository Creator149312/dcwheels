import { permanentRedirect, notFound } from "next/navigation";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { getListByIdCached } from "@lib/lists";
import { getListUrl } from "@utils/UrlHandler";

/**
 * Legacy list URL redirect handler.
 *
 * Redirects older multi-segment URL formats to the canonical
 * /lists/[slug]-[id] format:
 *   - /lists/[id]/[slug]          → /lists/[slug]-[id]
 *   - /lists/[id]/[slug]/extra    → /lists/[slug]-[id]
 *
 * Single-segment legacy URLs (/lists/[id] and /lists/[id]-[slug])
 * are handled directly by the canonical /lists/[slugId] route.
 */
export default async function LegacyListRedirectPage({ params }) {
  const { idSlug } = await params;

  if (!Array.isArray(idSlug) || idSlug.length === 0) {
    notFound();
  }

  const first = idSlug[0] || "";

  // Multi-segment legacy format: /lists/[id]/[slug]/...
  if (!mongoose.Types.ObjectId.isValid(first)) {
    notFound();
  }

  const list = await getListByIdCached(first);

  if (!list || list.isDeleted) {
    notFound();
  }

  const isPublic = list.isPublic ?? true;

  // Privacy check: private lists are only visible to their owner.
  if (!isPublic && !list.isSystem) {
    const session = await getServerSession(authOptions);
    const sessionUserId = session?.user?.id ? String(session.user.id) : null;
    const listUserId = list.userId ? String(list.userId) : null;
    if (!sessionUserId || !listUserId || sessionUserId !== listUserId) {
      notFound();
    }
  }

  permanentRedirect(getListUrl(list));
}
