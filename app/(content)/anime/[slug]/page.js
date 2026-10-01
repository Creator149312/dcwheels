/**
 * app/(content)/anime/[slug]/page.js
 *
 * Anime content pages — ISR, 14-day revalidation (anime metadata is stable).
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
  fetchAnimeExtras,
  fetchAnimeCharacters,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Topic metadata is stable — 30-day revalidation to reduce Vercel invocation costs.
// Dynamic sections (feed, votes, tracking status) are fetched fresh per request.
export const revalidate = 2592000;

const getCachedAnimePage = cache(async (relatedId) => {
  await connectMongoDB();
  const { getOrCreateTopicPage } = await import("@lib/topicPageLogic");
  return getOrCreateTopicPage("anime", relatedId);
});

// ---------------------------------------------------------------------------
// Next.js exports
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) return { title: "Not Found", description: "Content not found." };

  const pageDoc = await getCachedAnimePage(relatedId);
  if (!pageDoc) return { title: "Not Found", description: "Content not found." };

  return buildPageMetadata("anime", slug, pageDoc);
}

export default async function AnimePage({ params }) {
  const { slug } = await params;
  const relatedId = extractId(slug);
  if (!relatedId) notFound();

  const pageDoc = await getCachedAnimePage(relatedId);
  if (!pageDoc) notFound();

  const displayTitle = resolveTitle(pageDoc);

  // Slow external and DB fetches are kicked off as Promises (no await)
  const extrasPromise = fetchAnimeExtras(relatedId);
  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const charactersPromise = fetchAnimeCharacters(relatedId);
  const feedPromise = getFeedItemsSafe({ 
    type: "anime", 
    externalId: String(relatedId),
    limit: 9,
    docType: "post,wheel"
  });

  return (
    <TopicPageContentWrapper>
      <TopicPageLayout
        type="anime"
        pageDoc={pageDoc}
        displayTitle={displayTitle}
        affiliateLinks={buildAffiliateLinks("anime", displayTitle)}
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
