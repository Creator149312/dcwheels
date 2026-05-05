import { cache, Suspense } from "react";
import { validateObjectID } from "@utils/Validator";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import WheelInfoSection from "@components/WheelMeta";
import ViewTracker from "@components/ViewTracker";
import AdsUnit from "@components/ads/AdsUnit";
import RelatedWheels from "@components/RelatedWheels";
import { getWheelById, getRelatedWheelsByTags, getWheelMeta } from "@components/actions/actions";

// ISR: revalidate user-wheel pages every 30 minutes.
// View tracking runs client-side via <ViewTracker /> so this page can be
// CDN-cacheable. Per-user state (current user's reaction, follow status,
// auth-only buttons) is resolved client-side via useSession() inside
// WheelInfoSection — DO NOT call getServerSession() here, it forces
// dynamic rendering and defeats the CDN cache for every visitor.
export const revalidate = 1800;

// React.cache() dedupes the call so generateMetadata + the page body share
// a single DB round-trip per render. Without this, every cold ISR fill ran
// the same query twice.
const fetchWheelData = cache(async (id) => {
  return getWheelById(id);
});

const fetchRelatedWheels = cache(async (tags, currentId) => {
  return getRelatedWheelsByTags(tags, currentId);
});

export async function generateMetadata({ params }) {
  const listdata = await fetchWheelData(params.wheelId);

  if (listdata) {
    const meta = {
      title: listdata.title,
      description: `Explore ${listdata.title} and spin to pick a random choice.`,
    };

    if (listdata.wheelPreview) {
      meta.openGraph = {
        title: listdata.title,
        description: meta.description,
        type: "website",
        images: [
          {
            url: listdata.wheelPreview,
            width: 400,
            height: 400,
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
  // Early exit on invalid ObjectId — avoids a useless DB round-trip.
  if (!validateObjectID(params.wheelId)) {
    return <div>Invalid wheel ID.</div>;
  }

  // Single fetch — generateMetadata above already triggered the cached call,
  // so this is a no-op DB hit thanks to React.cache().
  const wordsList = await fetchWheelData(params.wheelId);

  return (
    <div>
      {wordsList ? (
        <>
          <ViewTracker wheelId={params.wheelId} />
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(wordsList.data)}
            wheelPresetSettings={wordsList?.wheelData ?? null}
            relatedWheelsSlot={
              <Suspense fallback={
                <aside className="hidden lg:block w-full p-0">
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="w-16 h-3 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-800 ml-2" />
                  </div>
                  <div className="space-y-1.5 pr-1">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
                        <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse flex-shrink-0" />
                        <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </aside>
              }>
                <SuspendedRelatedWheels tags={wordsList.tags} wheelId={params.wheelId} />
              </Suspense>
            }
            wheelId={params.wheelId}
          />

          <Suspense fallback={<div className="h-64 mt-8 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />}>
            <SuspendedMetaSection wordsList={wordsList} wheelId={params.wheelId} />
          </Suspense>

          {/* Bottom-of-page ad — shown after all content on both mobile
              and desktop. Same slot pattern as /wheels/[slug]. */}
          <AdsUnit slot="9397002286" />
        </>
      ) : (
        <div>
          We cannot find any Wheel. This has been deleted by the creator.
        </div>
      )}
    </div>
  );
}

// ── Suspense Wrapper Components ──────────────────────────────────────────

async function SuspendedRelatedWheels({ tags, wheelId }) {
  const relatedWheels =
    tags && tags.length > 0
      ? await fetchRelatedWheels(tags, wheelId)
      : [];

  return <RelatedWheels relatedWheels={relatedWheels} />;
}

async function SuspendedMetaSection({ wordsList, wheelId }) {
  const initialMeta = await getWheelMeta(wheelId, null);
  
  return (
    <WheelInfoSection
      wordsList={wordsList}
      wheelId={wheelId}
      initialMeta={initialMeta}
    />
  );
}
