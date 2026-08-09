/**
 * app/(content)/[type]/[slug]/page.js
 *
 * Generic content pages (Movie, TV, Anime, Game) — ISR, 7-day revalidation.
 * Uses shared TopicPageLayout and lib/feedService for cursor pagination.
 */

import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItemsSafe } from "@/lib/feedService";
import {
  extractId,
  resolveTitle,
  optimizeTitle,
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Topic metadata is stable — 30-day revalidation to reduce Vercel invocation costs.
// Dynamic sections (feed, votes, tracking status) are fetched fresh per request.
export const revalidate = 2592000;

/**
 * Shared Topic Fetcher (Cached)
 */
const getCachedTopicPage = cache(async (type, relatedId) => {
  await connectMongoDB();
  // Dynamic import to keep this bundle small and avoid circular deps
  const { getOrCreateTopicPage } = await import("@lib/topicPageLogic"); 
  return getOrCreateTopicPage(type, relatedId);
});

export async function generateMetadata({ params }) {
  const { type, slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found" };

  const pageDoc = await getCachedTopicPage(type, relatedId);
  if (!pageDoc) return { title: "Not Found" };

  return buildPageMetadata(type, slug, pageDoc);
}

export default async function GenericTopicPage({ params }) {
  const { type, slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedTopicPage(type, relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  // Slow external and DB fetches are kicked off as Promises (no await).
  // External fetchers are dynamically imported so only the relevant API
  // client is loaded for the current content type.
  const extrasPromise =
    type === "movie" || type === "tv"
      ? import("@lib/topicPage").then((m) => m.fetchMovieExtras(relatedId))
      : type === "anime"
      ? import("@lib/topicPage").then((m) => m.fetchAnimeExtras(relatedId))
      : type === "game"
      ? import("@lib/topicPage").then((m) => m.fetchGameExtras(relatedId))
      : null;

  const charactersPromise =
    type === "anime"
      ? import("@lib/topicPage").then((m) => m.fetchAnimeCharacters(relatedId))
      : null;

  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const feedPromise = getFeedItemsSafe({ 
    type, 
    externalId: String(relatedId),
    limit: 9,
    docType: "post,wheel"
  });

  return (
    <TopicPageContentWrapper>
      <TopicPageLayout
        type={type}
        pageDoc={pageDoc}
        displayTitle={displayTitle}
        affiliateLinks={buildAffiliateLinks(type, displayTitle)}
        relatedId={relatedId}
        tag={displayTitle}
        extrasPromise={extrasPromise}
        relatedPagesPromise={relatedPagesPromise}
        charactersPromise={charactersPromise}
        feedPromise={feedPromise}
      />
    </TopicPageContentWrapper>
  );
}
