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
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
  fetchTaggedWheels,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Character data rarely changes — 7-day revalidation.
export const revalidate = 604800;

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

  // Characters have no trailers or streaming links directly from Anilist character API.
  // Fetch related pages, tagged wheels, and prioritizing the tag feed.
  const [relatedPages, taggedWheels, feedData] = await Promise.all([
    getRelatedPages(pageDoc.tags || [], pageDoc._id),
    fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "character"),
    getFeedItems({ 
      tag: displayTitle,
      limit: 9 
    }),
  ]);

  return (
    <TopicPageContentWrapper>
      <TopicPageLayout
        type="character"
        pageDoc={pageDoc}
        extras={{ trailerKey: null, streaming: [] }}
        relatedPages={JSON.parse(JSON.stringify(relatedPages))}
        taggedWheels={JSON.parse(JSON.stringify(taggedWheels))}
        animeCharacters={[]}
        displayTitle={displayTitle}
        affiliateLinks={buildAffiliateLinks("character", displayTitle)}
        relatedId={relatedId}
        initialFeed={JSON.parse(JSON.stringify(feedData.slice(0, 8)))}
        initialCursor={feedData.length > 8 ? JSON.parse(JSON.stringify(feedData[8].createdAt)) : null}
        tag={displayTitle}
      />
    </TopicPageContentWrapper>
  );
}

