import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import WheelInfoSection from "@components/WheelMeta";
import { sessionUserId } from "@utils/SessionData";
import { connectMongoDB } from "@lib/mongodb";
import Visit from "@models/visit";
import mongoose from "mongoose";

// Shared fetcher for wheel data
async function fetchWheelData(id) {
  if (!validateObjectID(id)) return null;

  try {
    const response = await fetch(`${apiConfig.apiUrl}/wheel/${id}`, {
      // ✅ enable caching with revalidation
      next: { revalidate: 120 }, // cache for 2 minutes
    });

    if (!response.ok) throw new Error("Failed to fetch wheel");

    const data = await response.json();
    return data.list || null;
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

/*
 *  Metadata for SEO
 */
export async function generateMetadata({ params }) {
  const listdata = await fetchWheelData(params.wheelId);

  if (listdata) {
    return {
      title: listdata.title,
      description: `Explore ${listdata.title} and spin to pick a random choice.`,
    };
  }

  return {
    title: "No Wheels Found",
    description: "No Wheels Found",
    robots: "noindex",
  };
}

/**
 * Log a wheel visit for a user.
 * - Runs fire-and-forget (doesn't block rendering).
 * - Updates visitedAt if entry exists, otherwise creates new.
 */
export function storeVisit(userId, wheelId) {
  (async () => {
    try {
      await connectMongoDB();

      const wheelObjectId =
        typeof wheelId === "string"
          ? new mongoose.Types.ObjectId(wheelId)
          : wheelId;

      // Upsert: update visitedAt if exists, else insert new
      await Visit.findOneAndUpdate(
        { userId, wheelId: wheelObjectId },
        { visitedAt: new Date() },
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error("storeVisit error:", err);
    }
  })();
}



/*
 *  Page Component
 */
export default async function Page({ params }) {
  const session = await getServerSession(authOptions);
  const userId = await sessionUserId();
  const wordsList = await fetchWheelData(params.wheelId);
  const relatedWheels = await fetchRelatedWheels(wordsList.tags);
  const isVisitStored = await storeVisit(userId,params.wheelId );

  console.log("History Stored = "+ isVisitStored.ok)

  return (
    <div>
      {wordsList ? (
        <>
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(wordsList.data)}
            wheelPresetSettings={wordsList?.wheelData ?? null}
            relatedWheels={relatedWheels}
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
