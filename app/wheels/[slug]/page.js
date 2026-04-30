import { cache } from "react";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { redirect } from "next/navigation";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import {
  getPageDataBySlug,
  getRelatedWheelsByTags,
  getWheelMeta,
} from "@components/actions/actions";
import WheelInfoSection from "@components/WheelMeta";
import ViewTracker from "@components/ViewTracker";
import AdsUnit from "@components/ads/AdsUnit";
import { connectMongoDB } from "@/lib/mongodb";
import Page from "@models/page";

// Admin-curated /wheels/[slug] pages change infrequently — revalidate once a
// week. No session/headers calls here, so Next.js can fully static-render the
// page and the CDN serves ~99% of requests without touching the origin.
// Session-dependent UI (reactions, follow state) is resolved client-side via
// useSession() inside WheelMeta / StatsBar. View tracking runs client-side via
// <ViewTracker />. When an admin edits a page we can bust just that slug with
// revalidateTag('page:<slug>') instead of waiting out the timer.
export const revalidate = 604800; // 7 days

// Pre-render the highest-value indexed admin pages at build time. Anything
// outside the list still renders on-demand and then gets cached via
// `revalidate`, so the long tail costs nothing extra in build time.
//
// Sort by `wheel.likeCount` (popularity) rather than `createdAt`: the pages
// most likely to be hit first by crawlers and users are the ones already
// getting engagement, not the newest ones. Note that `likeCount` lives on the
// Wheel doc, not the Page, so we $lookup through the `wheel` ref.
//
// Cap at 500 — beyond that the marginal benefit drops sharply (most pages
// get <1 visit/day, so pre-building them just burns CI minutes for cache
// entries no one warms).
export async function generateStaticParams() {
  try {
    await connectMongoDB();
    const rows = await Page.aggregate([
      { $match: { indexed: true, slug: { $ne: null } } },
      {
        $lookup: {
          from: "wheels",
          localField: "wheel",
          foreignField: "_id",
          as: "wheel",
        },
      },
      { $unwind: { path: "$wheel", preserveNullAndEmptyArrays: true } },
      // `ifNull` keeps wheels with no likes from being sorted as `null` first.
      { $addFields: { _likeCount: { $ifNull: ["$wheel.likeCount", 0] } } },
      { $sort: { _likeCount: -1, createdAt: -1 } },
      { $limit: 500 },
      { $project: { slug: 1 } },
    ]);
    return rows.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
  } catch (err) {
    // If DB is unreachable at build time, fall back to fully on-demand
    // rendering instead of failing the whole build.
    console.error("generateStaticParams (/wheels) failed:", err);
    return [];
  }
}

// React.cache() dedupes the slug lookup between generateMetadata and the
// page body — without this every cold ISR fill ran the same aggregation
// twice.
const getCachedPageData = cache(async (slug) => {
  return getPageDataBySlug(slug);
});

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const pageData = await getCachedPageData(slug);

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

  const pageData = await getCachedPageData(slug);

  if (pageData === undefined) redirect("/");

  const wheelIdStr = pageData.wheel._id.toString();

  // Pre-fetch related wheels + public wheel meta (analytics, reactions,
  // comment count). `userId = null` keeps the response user-agnostic so the
  // rendered HTML is cacheable. Per-user reaction state is resolved client-side.
  // `getRelatedWheelsByTags` is a direct DB aggregation — replaces the prior
  // HTTP self-call to /api/related-wheels/advanced and saves one serverless
  // invocation per cold ISR fill.
  const [relatedWheels, initialMeta] = await Promise.all([
    pageData.wheel?.tags && pageData.wheel.tags.length > 0
      ? getRelatedWheelsByTags(pageData.wheel.tags, wheelIdStr)
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

      {/* Bottom-of-page ad — shown on both mobile and desktop after all
          content is consumed, where engagement is still high but UX impact
          is lowest. Slot 9397002286 is a responsive display unit. */}
      <AdsUnit slot="9397002286" />
    </div>
  );
}
