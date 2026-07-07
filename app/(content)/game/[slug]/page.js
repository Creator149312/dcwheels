/**
 * app/(content)/game/[slug]/page.js
 *
 * Game content pages — ISR, 14-day revalidation (store/streaming data changes).
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
  fetchGameExtras,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Cache for 14 days (bi-weekly) to balance content freshness with Vercel duration costs.
export const revalidate = 1209600;

const getCachedGamePage = cache(async (relatedId) => {
  await connectMongoDB();
  const { getOrCreateTopicPage } = await import("@lib/topicPageLogic"); 
  return getOrCreateTopicPage("game", relatedId);
});

// ---------------------------------------------------------------------------
// Next.js exports
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found", description: "Content not found." };

  const pageDoc = await getCachedGamePage(relatedId);
  if (!pageDoc) return { title: "Not Found", description: "Content not found." };

  return buildPageMetadata("game", slug, pageDoc);
}

export default async function GamePage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedGamePage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  // Slow external and DB fetches are kicked off as Promises (no await)
  const extrasPromise = fetchGameExtras(relatedId);
  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const taggedWheelsPromise = fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "game");
  const feedPromise = getFeedItems({ 
    type: "game", 
    externalId: String(relatedId),
    limit: 9 
  });

  return (
    <TopicPageContentWrapper>
      <TopicPageLayout
        type="game"
        pageDoc={pageDoc}
        displayTitle={displayTitle}
        affiliateLinks={buildAffiliateLinks("game", displayTitle)}
        relatedId={relatedId}
        tag={displayTitle}
        extrasPromise={extrasPromise}
        relatedPagesPromise={relatedPagesPromise}
        taggedWheelsPromise={taggedWheelsPromise}
        charactersPromise={Promise.resolve([])} // Cast carousel disabled for games
        feedPromise={feedPromise}
      />
    </TopicPageContentWrapper>
  );
}
