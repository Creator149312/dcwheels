import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import WheelInfoSection from "@components/WheelMeta";
import { headers } from "next/headers";
import { incrementWheelViewCount, shouldTrackView } from "@lib/wheelAnalytics";

const adminCommonID = "gauravsingh9314@gmail.com";

// Updated Shared fetcher for wheel data, longer caching if wheel is created by admin otherwise it is short
// async function fetchWheelData(id) {
//   if (!validateObjectID(id)) return null;

//   try {
//     const response = await fetch(`${apiConfig.apiUrl}/wheel/${id}`, {
//       // ✅ enable caching with revalidation
//       next: { revalidate: 360 }, // cache for 2 minutes
//     });

//     if (!response.ok) throw new Error("Failed to fetch wheel");

//     const data = await response.json();
//     return data.list || null;
//   } catch (err) {
//     console.error("Wheel fetch failed:", err);
//     return null;
//   }
// }

async function fetchWheelData(id) {
  if (!validateObjectID(id)) return null;

  try {
    // Decide cache duration before fetching
    // Default short cache (6 minutes), longer cache (1 week) if admin
    const response = await fetch(`${apiConfig.apiUrl}/wheel/${id}`);

    if (!response.ok) throw new Error("Failed to fetch wheel");

    const data = await response.json();
    const wheel = data.list || null;

    if (!wheel) return null;

    const createdByAdmin = wheel?.createdBy === adminCommonID;

    // Pick cache duration based on admin flag
    const cacheDuration = createdByAdmin ? 604800 : 120;
    //  console.log("Created By Admin = " + createdByAdmin + " Cache Duration =" + cacheDuration);

    // Return wheel data with correct cache duration applied
    const cachedResponse = await fetch(`${apiConfig.apiUrl}/wheel/${id}`, {
      next: { revalidate: cacheDuration },
    });

    if (!cachedResponse.ok) throw new Error("Failed to fetch wheel with cache");

    const cachedData = await cachedResponse.json();
    return cachedData.list || null;
  } catch (err) {
    console.error("Wheel fetch failed:", err);
    return null;
  }
}

async function fetchRelatedWheels(tags) {
  // ✅ Fetch on the server
  const res = await fetch(
    `${apiConfig.apiUrl}/related-wheels/advanced?tags=${tags.join(",")}`
    // { cache: "no-store" } // or { next: { revalidate: 60 } } for caching
  );
  return await res.json();
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
  const session = await getServerSession(authOptions);
  const wordsList = await fetchWheelData(params.wheelId);

  const requestHeaders = headers();
  if (wordsList && shouldTrackView(requestHeaders)) {
    await incrementWheelViewCount(params.wheelId);
  }

  const relatedWheels =
    wordsList?.tags && wordsList.tags.length > 0
      ? await fetchRelatedWheels(wordsList.tags)
      : [];

  return (
    <div>
      {wordsList ? (
        <>
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
