/**
 * app/(content)/[type]/[slug]/page.js
 *
 * Generic content pages (Movie, TV, Anime, Game) — ISR, 7-day revalidation.
 * Uses shared TopicPageLayout and lib/feedService for cursor pagination.
 */

import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItems } from "@/lib/feedService";
import {
  extractId,
  resolveTitle,
  optimizeTitle,
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
  fetchTaggedWheels,
  fetchMovieExtras,
  fetchAnimeExtras,
  fetchAnimeCharacters,
  fetchGameExtras,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Cache for 14 days (bi-weekly) to balance content freshness with Vercel duration costs.
export const revalidate = 1209600;

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

  // Slow external and DB fetches are kicked off as Promises (no await)
  const extrasPromise = 
    type === "movie" || type === "tv"
      ? fetchMovieExtras(relatedId)
      : type === "anime"
      ? fetchAnimeExtras(relatedId)
      : type === "game"
      ? fetchGameExtras(relatedId)
      : Promise.resolve({ trailerKey: null, streaming: [] });

  const charactersPromise = type === "anime" ? fetchAnimeCharacters(relatedId) : Promise.resolve([]);
  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const taggedWheelsPromise = fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, type);
  const feedPromise = getFeedItems({ 
    type, 
    externalId: String(relatedId),
    limit: 9 
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
        taggedWheelsPromise={taggedWheelsPromise}
        charactersPromise={charactersPromise}
        feedPromise={feedPromise}
      />
    </TopicPageContentWrapper>
  );
}
