/**
 * app/(content)/movie/[slug]/page.js
 *
 * Movie content pages — ISR, 1-day revalidation.
 *
 * Only TMDB imports live here. @spkrbox/anilist and RAWG fetchers are
 * absent from this bundle entirely — they only exist in anime/ and game/.
 */

import { cache } from "react";
import { connectMongoDB } from "@/lib/mongodb";
import TopicPage from "@/models/topicpage";
import { slugify } from "@utils/HelperFunctions";
import { getFeedItems } from "@/lib/feedService";
import {
  extractId,
  resolveTitle,
  optimizeTitle,
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
  fetchTaggedWheels,
  rewriteAndPersist,
  fetchMovieExtras,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Cache for 14 days (bi-weekly) to balance content freshness with Vercel duration costs.
export const revalidate = 1209600;

// React.cache() deduplicates between generateMetadata and the page body.
const getCachedMoviePage = cache(async (relatedId) => {
  await connectMongoDB();
  const { getOrCreateTopicPage } = await import("@lib/topicPageLogic");
  return getOrCreateTopicPage("movie", relatedId);
});

// ---------------------------------------------------------------------------
// Next.js exports
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found", description: "Content not found." };

  const pageDoc = await getCachedMoviePage(relatedId);
  if (!pageDoc) return { title: "Not Found", description: "Content not found." };

  return buildPageMetadata("movie", slug, pageDoc);
}

export default async function MoviePage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedMoviePage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  // Slow external and DB fetches are kicked off as Promises (no await)
  const extrasPromise = fetchMovieExtras(relatedId);
  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const taggedWheelsPromise = fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "movie");
  const feedPromise = getFeedItems({ 
    type: "movie", 
    externalId: String(relatedId),
    limit: 9 
  });

  return (
    <TopicPageContentWrapper>
      <TopicPageLayout
        type="movie"
        pageDoc={pageDoc}
        displayTitle={displayTitle}
        affiliateLinks={buildAffiliateLinks("movie", displayTitle)}
        relatedId={relatedId}
        tag={displayTitle}
        extrasPromise={extrasPromise}
        relatedPagesPromise={relatedPagesPromise}
        taggedWheelsPromise={taggedWheelsPromise}
        charactersPromise={Promise.resolve([])} // Cast carousel disabled for movies for now
        feedPromise={feedPromise}
      />
    </TopicPageContentWrapper>
  );
}
