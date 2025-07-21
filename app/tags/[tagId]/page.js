import { notFound } from "next/navigation";
import WheelCard from "@app/test/TagsTesting/WheelCard";
import apiConfig from "@utils/ApiUrlConfig";

// Optional: configure revalidation (ISR)
// const REVALIDATE_SECONDS = 60;

// Dynamically generate metadata
export async function generateMetadata({ params }) {
  const tag = decodeURIComponent(params.tagId);
  const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);

  return {
    title: `${capitalizedTag} Decision Picker Wheels`, //& Decision Pickers
    description: `Browse all wheels tagged under "${capitalizedTag}". Spin and explore interactive wheels by category.`,
  };
}

// Server-side data fetching
async function getWheelsByTag(tagId) {
  try {
    const res = await fetch(
      `${apiConfig.apiUrl}/wheels-by-tag?tag=${encodeURIComponent(tagId)}`
    );

    if (!res.ok) throw new Error("Failed to fetch");

    const data = await res.json();
    return data.wheels || [];
  } catch (err) {
    console.error("Error fetching wheels:", err);
    return [];
  }
}

// Server Component
export default async function TagDetailPage({ params }) {
  const tagId = decodeURIComponent(params.tagId);
  const wheels = await getWheelsByTag(tagId);

  if (!wheels) return notFound();

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto dark:bg-gray-950 min-h-screen transition-colors">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white capitalize">
        {tagId} Wheels
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {wheels.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400">
            No wheels found for “{tagId}”.
          </p>
        ) : (
          wheels.map((wheel) => (
            <div key={wheel._id} className="h-full">
              <WheelCard wheel={wheel} className="h-full" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
