import { cache, Suspense } from "react";
import { validateObjectID } from "@utils/Validator";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import dynamic from "next/dynamic";
import WheelInfoStatic from "@components/WheelInfoStatic";
import Description from "@components/description/Description";
import ViewTracker from "@components/ViewTracker";
import RelatedTopicLinks from "@components/RelatedTopicLinks";
import { getWheelById, getRelatedTopicPages } from "@components/actions/actions";
import {
  SuspendedRelatedWheels,
  SuspendedInfoActions,
  SuspendedStatsFeed,
  RelatedWheelsSkeleton,
  InfoActionsSkeleton,
  StatsFeedSkeleton,
} from "@components/WheelPageSections";

// AdsUnit is ssr:false — AdSense has no crawlable content.
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), { ssr: false });

// ISR: revalidate user-wheel pages every 7 days.
// View tracking runs client-side via <ViewTracker /> so this page can be
// CDN-cacheable. Per-user state (current user's reaction, follow status,
// auth-only buttons) is resolved client-side via useSession() inside
// WheelInfoSection.
export const revalidate = 604800; // 7 days

// React.cache() dedupes the call so generateMetadata + the page body share
// a single DB round-trip per render.
const fetchWheelData = cache(async (id) => {
  const wheel = await getWheelById(id);
  if (!wheel) return null;

  // PARALLEL OPTIMIZATION:
  // Instead of awaiting database calls sequentially in the component,
  // we can trigger the related topics fetch immediately and return it with the wheel.
  // This "pre-packs" our data in one go.
  const resolvedTopics = await getRelatedTopicPages(wheel.relatedTopics);
  
  return { ...wheel, _relatedTopicDocs: resolvedTopics };
});

export async function generateMetadata({ params }) {
  const listdata = await fetchWheelData(params.wheelId);

  if (listdata) {
    const meta = {
      title: listdata.title,
      description: listdata.description || `Explore ${listdata.title} and spin to pick a random choice.`,
    };

    if (listdata.wheelPreview) {
      meta.openGraph = {
        title: listdata.title,
        description: meta.description,
        type: "website",
        images: [
          {
            url: listdata.wheelPreview,
            width: 640,
            height: 640,
            alt: listdata.title,
          },
        ],
      };
      meta.twitter = {
        card: "summary_large_image",
        title: listdata.title,
        description: meta.description,
        images: [listdata.wheelPreview],
      };
    }

    return meta;
  }

  return {
    title: "No Wheels Found",
    description: "No Wheels Found",
    robots: "noindex",
  };
}

/*
 *  Page Component
 */
export default async function Page({ params }) {
  const { wheelId } = params;

  // Early exit on invalid ObjectId — avoids a useless DB round-trip.
  if (!validateObjectID(wheelId)) {
    return <div>Invalid wheel ID.</div>;
  }

  // Single fetch — generateMetadata above already triggered the cached call,
  // so this is a no-op DB hit thanks to React.cache().
  const wordsList = await fetchWheelData(wheelId);

  // Extract pre-fetched topics — they were resolved in parallel in the cache layer
  const relatedTopics = wordsList?._relatedTopicDocs || [];

  return (
    <div>
      {wordsList ? (
        <>
          <ViewTracker wheelId={wheelId} />
          {/* JSON-LD Structured Data for Google Indexing (Zero Core Web Vitals impact) */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebApplication",
                name: wordsList.title,
                description: wordsList.description || `Explore ${wordsList.title} and spin to pick a random choice.`,
                applicationCategory: "BrowserApplication",
                operatingSystem: "All",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD"
                },
                ...(wordsList.wheelPreview && { image: wordsList.wheelPreview })
              }),
            }}
          />
          {/* Wheel canvas — always first */}
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(wordsList.data)}
            wheelPresetSettings={wordsList.wheelData ?? null}
            wheelTypeProp={wordsList?.wheelType ?? "basic"}
            relatedWheelsSlot={
              <Suspense fallback={<RelatedWheelsSkeleton />}>
                <SuspendedRelatedWheels tags={wordsList.tags} wheelId={wheelId} />
              </Suspense>
            }
            wheelId={wheelId}
          />

          {/* h1 title — Server Component, arrives in first HTML flush (LCP) */}
          <WheelInfoStatic wordsList={wordsList} />

          {/* Creator + stats + action buttons — own Suspense directly below title */}
          <Suspense fallback={<InfoActionsSkeleton />}>
            <SuspendedInfoActions
              wheelId={wheelId}
              wheelTitle={wordsList.title}
              wheelEntityType="uwheel"
              wheelSlug={wheelId}
              createdAt={wordsList.createdAt}
              createdBy={wordsList.createdBy}
              authorHandle={wordsList.authorHandle}
            />
          </Suspense>

          {/* Tags — static, render instantly with no DB wait */}
          {Array.isArray(wordsList.tags) && wordsList.tags.length > 0 && (
            <div className="w-full px-4 flex flex-wrap gap-1.5 mt-2 mb-3 text-left">
              {wordsList.tags.map((tag) => (
                <a
                  key={tag}
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}

          {/* Associated TopicPage links — helps with the "Source of Truth" linking */}
          {relatedTopics.length > 0 && (
            <div className="w-full px-4 mb-3">
              <RelatedTopicLinks topics={relatedTopics} />
            </div>
          )}

          {/* Description — client component but SSR'd so text is indexable */}
          <div className="w-full px-4 text-left">
            <Description wordsList={wordsList} />
          </div>

          {/* Stats bar + spin feed — separate Suspense, fully independent */}
          <Suspense fallback={<StatsFeedSkeleton />}>
            <SuspendedStatsFeed wheelId={wheelId} />
          </Suspense>

          {/* Bottom-of-page ad — min-h prevents CLS when AdSense loads async. */}
          <div className="min-h-[90px]">
            <AdsUnit slot="9397002286" />
          </div>
        </>
      ) : (
        <div>
          We cannot find any Wheel. This has been deleted by the creator.
        </div>
      )}
    </div>
  );
}
