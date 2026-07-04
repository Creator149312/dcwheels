/**
 * app/(content)/[type]/[slug]/page.js
 *
 * Generic content pages (Movie, TV, Anime, Game) — ISR, 7-day revalidation.
 * Uses shared TopicPageLayout and lib/feedService for cursor pagination.
 */

import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import { getFeedItems } from "@/lib/feedService";
import {
  extractId,
  resolveTitle,
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
  fetchTaggedWheels,
  fetchMovieExtras,
  fetchAnimeExtras,
  fetchAnimeCharacters,
  fetchGameExtras,
} from "@lib/topicPage";
import { getOrCreateTopicPage } from "@/lib/topicPage"; // Assuming we move it or keep it
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Cache for 7 days to reduce Vercel duration costs and stabilize content
export const revalidate = 604800;

/**
 * Shared Topic Fetcher (Cached)
 * generateMetadata and the Page both call this. React.cache prevents re-fetching.
 */
const getCachedTopicPage = cache(async (type, relatedId) => {
  await connectMongoDB();
  // Import dynamically to avoid build-time issues if model isn't ready
  const { getOrCreateTopicPage } = await import("@lib/topicPageLogic"); 
  return getOrCreateTopicPage(type, relatedId);
});

export async function generateMetadata({ params }) {
  const { type, slug } = params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found" };

  const pageDoc = await getCachedTopicPage(type, relatedId);
  if (!pageDoc) return { title: "Not Found" };

  return buildPageMetadata(type, slug, pageDoc);
}

export default async function GenericTopicPage({ params }) {
  const { type, slug } = params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedTopicPage(type, relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  // Fetch all secondary data in parallel
  const [extras, animeCharacters, relatedPages, taggedWheels, feedData] = await Promise.all([
    type === "movie" || type === "tv"
      ? fetchMovieExtras(relatedId)
      : type === "anime"
      ? fetchAnimeExtras(relatedId)
      : type === "game"
      ? fetchGameExtras(relatedId)
      : { trailerKey: null, streaming: [] },
    type === "anime" ? fetchAnimeCharacters(relatedId) : [],
    getRelatedPages(pageDoc.tags || [], pageDoc._id),
    fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, type),
    getFeedItems({ 
      type, 
      externalId: String(relatedId),
      limit: 30 
    }),
  ]);

  return (
    <TopicPageLayout
      type={type}
      pageDoc={pageDoc}
      extras={extras}
      relatedPages={relatedPages}
      taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
      animeCharacters={animeCharacters}
      displayTitle={displayTitle}
      affiliateLinks={buildAffiliateLinks(type, displayTitle)}
      relatedId={relatedId}
      initialFeed={JSON.parse(JSON.stringify(feedData))}
      initialCursor={feedData.length === 30 ? feedData[feedData.length - 1].createdAt : null}
    />
  );
}
