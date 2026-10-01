/**
 * app/(content)/game/[slug]/page.js
 *
 * Game content pages — ISR, 14-day revalidation (store/streaming data changes).
 */

import { cache } from "react";
import { notFound } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import { getFeedItemsSafe } from "@/lib/feedService";
import {
  extractId,
  resolveTitle,
  optimizeTitle,
  buildPageMetadata,
  buildAffiliateLinks,
  getRelatedPages,
  fetchGameExtras,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Topic metadata is stable — 30-day revalidation to reduce Vercel invocation costs.
// Dynamic sections (feed, votes, tracking status) are fetched fresh per request.
export const revalidate = 2592000;

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
  if (!relatedId) notFound();

  const pageDoc = await getCachedGamePage(relatedId);
  if (!pageDoc) notFound();

  const displayTitle = resolveTitle(pageDoc);

  // Slow external and DB fetches are kicked off as Promises (no await)
  const extrasPromise = fetchGameExtras(relatedId);
  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const feedPromise = getFeedItemsSafe({ 
    type: "game", 
    externalId: String(relatedId),
    limit: 9,
    docType: "post,wheel"
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
        charactersPromise={Promise.resolve([])} // Cast carousel disabled for games
        feedPromise={feedPromise}
      />
    </TopicPageContentWrapper>
  );
}
