/**
 * app/(content)/anime/[slug]/page.js
 *
 * Anime content pages — ISR, 14-day revalidation (anime metadata is stable).
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
  fetchAnimeExtras,
  fetchAnimeCharacters,
} from "@lib/topicPage";
import TopicPageContentWrapper from "@components/TopicPageContentWrapper";
import TopicPageLayout from "@app/(content)/_shared/TopicPageLayout";

// Anime metadata is stable — 14-day revalidation (bi-weekly) to reduce Vercel invocation costs.
export const revalidate = 1209600;

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
  if (!relatedId) return <div>Invalid URL</div>;

  const pageDoc = await getCachedAnimePage(relatedId);
  if (!pageDoc) return <div>Not found</div>;

  const displayTitle = resolveTitle(pageDoc);

  // Slow external and DB fetches are kicked off as Promises (no await)
  const extrasPromise = fetchAnimeExtras(relatedId);
  const relatedPagesPromise = getRelatedPages(pageDoc.tags || [], pageDoc._id);
  const taggedWheelsPromise = fetchTaggedWheels(pageDoc.tags || [], pageDoc.relatedId, "anime");
  const charactersPromise = fetchAnimeCharacters(relatedId);
  const feedPromise = getFeedItems({ 
    type: "anime", 
    externalId: String(relatedId),
    limit: 9 
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
        taggedWheelsPromise={taggedWheelsPromise}
        charactersPromise={charactersPromise}
        feedPromise={feedPromise}
      />
    </TopicPageContentWrapper>
  );
}
