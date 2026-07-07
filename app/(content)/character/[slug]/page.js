/**
 * app/(content)/character/[slug]/page.js
 *
 * Character content pages — ISR, 7-day revalidation.
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
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Character data rarely changes — 30-day revalidation to reduce Vercel invocation costs.
export const revalidate = 2592000;

/**
 * Shared Topic Fetcher (Cached)
 */
const getCachedCharacterPage = cache(async (relatedId) => {
  await connectMongoDB();
  const { getOrCreateTopicPage } = await import("@lib/topicPageLogic"); 
  return getOrCreateTopicPage("character", relatedId);
});

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found" };

  const pageDoc = await getCachedCharacterPage(relatedId);
  if (!pageDoc) return { title: "Not Found" };

  return buildPageMetadata("character", slug, pageDoc);
}

export default async function CharacterPage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedCharacterPage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  // Kicked off as async Promises to support fast loading and Suspense streaming
  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const taggedWheelsPromise = fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "character");
  const feedPromise = getFeedItems({ 
    tag: displayTitle,
    limit: 9 
  });

  return (
    <TopicPageContentWrapper>
      <TopicPageLayout
        type="character"
        pageDoc={pageDoc}
        displayTitle={displayTitle}
        affiliateLinks={buildAffiliateLinks("character", displayTitle)}
        relatedId={relatedId}
        tag={displayTitle}
        extrasPromise={Promise.resolve({ trailerKey: null, streaming: [] })}
        relatedPagesPromise={relatedPagesPromise}
        taggedWheelsPromise={taggedWheelsPromise}
        charactersPromise={Promise.resolve([])}
        feedPromise={feedPromise}
      />
    </TopicPageContentWrapper>
  );
}

