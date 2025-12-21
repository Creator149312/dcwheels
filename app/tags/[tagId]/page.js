import { notFound } from "next/navigation";
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
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* ✅ Title */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        {tagId.charAt(0).toUpperCase() + tagId.slice(1)} Wheels
      </h1>

      {/* ✅ Empty State */}
      {wheels.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-center mt-20">
          No wheels found for “{tagId}”.
        </div>
      )}

      {/* ✅ Wheels Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {wheels.map((wheel) => (
          <a
            key={wheel._id}
            href={`/uwheels/${wheel._id}`}
            className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition"
          >
            {/* ✅ Cover Placeholder (First Letter of Title) */}
            <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500 text-4xl font-bold">
                {wheel.title?.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* ✅ Text Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {wheel.title}
              </h3>
            </div>
          </a>
        ))}
      </div>

      {/* ✅ Load More Button */}
      {/* {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )} */}
    </div>
  );
}
