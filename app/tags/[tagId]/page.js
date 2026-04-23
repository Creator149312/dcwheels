import { notFound } from "next/navigation";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";
import { getWheelsByTag } from "@components/actions/actions";
import TagWheelsGrid from "@components/TagWheelsGrid"; // We will create this

// Tag pages rarely change — cache aggressively. No session/headers calls,
// so Next.js can statically render + CDN-cache these.
export const revalidate = 21600; // 6 hours

// Pre-render the top N tag pages at build time. Anything outside the list
// still renders on-demand (then gets cached via `revalidate` above).
// We keep N small so build stays fast — popular tags soak up most traffic
// thanks to long-tail distribution.
export async function generateStaticParams() {
  try {
    await connectMongoDB();

    // Unwind tags, lowercase them (defensive for pre-migration data),
    // group + count, pick the top 50.
    const top = await Wheel.aggregate([
      { $match: { tags: { $exists: true, $ne: [] } } },
      { $unwind: "$tags" },
      { $project: { tag: { $toLower: "$tags" } } },
      { $group: { _id: "$tag", n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 50 },
    ]);

    return top
      .filter((t) => t._id)
      .map((t) => ({ tagId: t._id }));
  } catch (err) {
    // If DB is unreachable at build time, fall back to on-demand rendering
    // for every tag instead of breaking the whole build.
    console.error("generateStaticParams (tags) failed:", err);
    return [];
  }
}

export async function generateMetadata({ params }) {
  const tag = decodeURIComponent(params.tagId);
  const capitalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1);
  return {
    title: `${capitalizedTag} Decision Picker Wheels`,
    description: `Browse wheels tagged under "${capitalizedTag}".`,
  };
}

export default async function TagDetailPage({ params }) {
  const tagId = decodeURIComponent(params.tagId);

  // Direct DB read — replaces prior HTTP self-call to /api/wheels-by-tag.
  // Saves one serverless invocation per cold hit.
  const initialWheels = await getWheelsByTag(tagId, { limit: 20, skip: 0 });

  if (!initialWheels) return notFound();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-950 min-h-screen">
      <header className="mb-8 border-b border-gray-100 dark:border-gray-900 pb-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white capitalize">
          {tagId} <span className="text-blue-600">Wheels</span>
        </h1>
      </header>

      {/* Pass data to the Client Component */}
      <TagWheelsGrid initialWheels={initialWheels} tagId={tagId} />
    </div>
  );
}
