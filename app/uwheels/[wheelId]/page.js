import { cache } from "react";
import { validateObjectID } from "@utils/Validator";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import WheelInfoSection from "@components/WheelMeta";
import ViewTracker from "@components/ViewTracker";
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

  // userId = null keeps the rendered HTML user-agnostic so the CDN can cache
  // it. The client component re-fetches a personalised meta payload after
  // hydration if the user is signed in.
  const [relatedWheels, initialMeta] = await Promise.all([
    wordsList?.tags && wordsList.tags.length > 0
      ? fetchRelatedWheels(wordsList.tags, params.wheelId)
      : Promise.resolve([]),
    wordsList
      ? getWheelMeta(params.wheelId, null)
      : Promise.resolve(null),
  ]);

  return (
    <div>
      {wordsList ? (
        <>
          <ViewTracker wheelId={params.wheelId} />
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(wordsList.data)}
            wheelPresetSettings={wordsList?.wheelData ?? null}
            relatedWheels={relatedWheels}
            wheelId={params.wheelId}
          />

          <WheelInfoSection
            wordsList={wordsList}
            wheelId={params.wheelId}
            initialMeta={initialMeta}
          />
        </>
      ) : (
        <div>
          We cannot find any Wheel. This has been deleted by the creator.
        </div>
      )}
    </div>
  );
}
