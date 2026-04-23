import { validateObjectID } from "@utils/Validator";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import WheelInfoSection from "@components/WheelMeta";
import ViewTracker from "@components/ViewTracker";
import { getWheelById, getRelatedWheelsByTags, getWheelMeta } from "@components/actions/actions";

// ISR: revalidate user-wheel pages every 10 minutes.
// View tracking runs client-side via <ViewTracker /> so this page can be
// CDN-cached instead of invoking analytics on every request.
export const revalidate = 600;

async function fetchWheelData(id) {
  // Direct DB call (bypasses HTTP self-call to /api/wheel/[id]).
  // Saves ~200-400ms TTFB + one serverless invocation per page load.
  return getWheelById(id);
}

async function fetchRelatedWheels(tags, currentId) {
  // Direct DB aggregation (bypasses HTTP self-call to /api/related-wheels/advanced).
  return getRelatedWheelsByTags(tags, currentId);
}

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

  // Fetch wheel data and session in parallel
  const [session, wordsList] = await Promise.all([
    getServerSession(authOptions),
    fetchWheelData(params.wheelId),
  ]);

  // Fetch related wheels only if tags exist (don't block initial render)
  const [relatedWheels, initialMeta] = await Promise.all([
    wordsList?.tags && wordsList.tags.length > 0
      ? fetchRelatedWheels(wordsList.tags, params.wheelId)
      : Promise.resolve([]),
    wordsList
      ? getWheelMeta(params.wheelId, session?.user?.id || null)
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
            session={session}
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
