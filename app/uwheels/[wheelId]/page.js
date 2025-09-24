import { validateObjectID } from "@utils/Validator";
import apiConfig from "@utils/ApiUrlConfig";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import WheelInfoSection from "@components/WheelMeta";

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

/*
 *  Page Component
 */
export default async function Page({ params }) {
  const session = await getServerSession(authOptions);
  const wordsList = await fetchWheelData(params.wheelId);

  return (
    <div>
      {wordsList ? (
        <>
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(wordsList.data)}
            wheelPresetSettings={wordsList?.wheelData ?? null}
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
