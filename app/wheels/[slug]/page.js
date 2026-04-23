import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { redirect } from "next/navigation";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import {
  fetchRelatedWheels,
  getPageDataBySlug,
  getWheelMeta,
} from "@components/actions/actions";
import WheelInfoSection from "@components/WheelMeta";
import ViewTracker from "@components/ViewTracker";

// Admin-curated /wheels/[slug] pages change infrequently — revalidate once a day.
// No session/headers calls here, so Next.js can fully static-render the page
// and the CDN will serve ~99% of requests without touching the origin.
// Session-dependent UI (reactions, follow state) is resolved client-side via
// useSession() inside WheelMeta / StatsBar. View tracking runs client-side
// via <ViewTracker />.
export const revalidate = 86400; // 1 day

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const pageData = await getPageDataBySlug(slug);

  if (pageData === undefined) redirect("/"); //this is done to ensure only valid urls are loaded and all others are redirected to homepage.

  const metadata = {
    title: pageData.title,
    description: pageData.description,
  };

  // Add Open Graph image for SEO indexing if wheelPreview exists
  if (pageData.wheel?.wheelPreview) {
    metadata.openGraph = {
      title: pageData.title,
      description: pageData.description,
      type: "website",
      images: [
        {
          url: pageData.wheel.wheelPreview,
          width: 400,
          height: 400,
          alt: pageData.title,
        },
      ],
    };
    metadata.twitter = {
      card: "summary_large_image",
      title: pageData.title,
      description: pageData.description,
      images: [pageData.wheel.wheelPreview],
    };
  }

  return metadata;
}

export default async function Home({ params }) {
  const slug = params.slug;

  const pageData = await getPageDataBySlug(slug);

  if (pageData === undefined) redirect("/");

  const wheelIdStr = pageData.wheel._id.toString();

  // Pre-fetch related wheels + public wheel meta (analytics, reactions,
  // comment count). `userId = null` keeps the response user-agnostic so the
  // rendered HTML is cacheable. Per-user reaction state is resolved client-side.
  const [relatedWheels, initialMeta] = await Promise.all([
    pageData.wheel?.tags && pageData.wheel.tags.length > 0
      ? fetchRelatedWheels(pageData.wheel.tags)
      : Promise.resolve([]),
    getWheelMeta(wheelIdStr, null),
  ]);

  return (
    <div className="flex flex-col">
      {/* Client-only view counter — decoupled so this page stays static */}
      <ViewTracker wheelId={wheelIdStr} />

      {/* Main Wheel Section */}
      <div className="relative">
        <WheelWithInputContentEditable
          newSegments={ensureArrayOfObjects(pageData.wheel.data)}
          wheelPresetSettings={pageData.wheel.wheelData}
          relatedWheels={relatedWheels}
          wheelId={wheelIdStr}
        />
      </div>

      {/* Information Section — resolves session client-side via useSession() */}
      <WheelInfoSection
        wordsList={pageData.wheel}
        wheelId={pageData.wheel._id}
        pageData={pageData}
        initialMeta={initialMeta}
      />
    </div>
  );
}
