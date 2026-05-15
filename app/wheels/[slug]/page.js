import { cache, Suspense } from "react";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { redirect } from "next/navigation";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getPageDataBySlug } from "@components/actions/actions";
import dynamic from "next/dynamic";
import WheelInfoStatic from "@components/WheelInfoStatic";
import Description from "@components/description/Description";
import ViewTracker from "@components/ViewTracker";
import { connectMongoDB } from "@/lib/mongodb";
import Page from "@models/page";
import {
  SuspendedRelatedWheels,
  SuspendedInfoActions,
  SuspendedStatsFeed,
  RelatedWheelsSkeleton,
  InfoActionsSkeleton,
  StatsFeedSkeleton,
} from "@components/WheelPageSections";

// AdsUnit has no SEO value so ssr:false removes it from the HTML entirely.
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), {
  ssr: false,
});

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
          width: 640,
          height: 640,
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

  return (
    <div className="flex flex-col">
      {/* Client-only view counter — decoupled so this page stays static */}
      <ViewTracker wheelId={wheelIdStr} />

      {/* JSON-LD Structured Data for Google Indexing (Zero Core Web Vitals impact) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: pageData.title,
            description: pageData.description,
            applicationCategory: "BrowserApplication",
            operatingSystem: "All",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD"
            },
            ...(pageData.wheel.wheelPreview && { image: pageData.wheel.wheelPreview })
          }),
        }}
      />

      {/* Main Wheel Section */}
      <div className="relative">
        <WheelWithInputContentEditable
          newSegments={ensureArrayOfObjects(pageData.wheel.data)}
          wheelPresetSettings={pageData.wheel.wheelData}
          relatedWheelsSlot={
            <Suspense fallback={<RelatedWheelsSkeleton />}>
              <SuspendedRelatedWheels
                tags={pageData.wheel.tags}
                wheelId={wheelIdStr}
              />
            </Suspense>
          }
          wheelId={wheelIdStr}
        />
      </div>

      {/* h1 title — Server Component, arrives in first HTML flush (LCP) */}
      <WheelInfoStatic wordsList={pageData.wheel} />

      {/* Creator + stats + action buttons — own Suspense directly below title */}
      <Suspense fallback={<InfoActionsSkeleton />}>
        <SuspendedInfoActions
          wheelId={wheelIdStr}
          createdAt={pageData.wheel.createdAt}
          createdBy={pageData.wheel.createdBy}
        />
      </Suspense>

      {/* Tags — static, render instantly with no DB wait */}
      {Array.isArray(pageData.wheel.tags) && pageData.wheel.tags.length > 0 && (
        <div className="w-full px-4 flex flex-wrap gap-1.5 mt-2 mb-3 text-left">
          {pageData.wheel.tags.map((tag) => (
            <a
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            >
              #{tag}
            </a>
          ))}
        </div>
      )}

      {/* Description — client component but SSR'd so text is indexable */}
      <div className="w-full px-4 text-left">
        <Description pageData={pageData} wordsList={pageData.wheel} />
      </div>

      {/* Stats bar + spin feed — separate Suspense, fully independent */}
      <Suspense fallback={<StatsFeedSkeleton />}>
        <SuspendedStatsFeed wheelId={wheelIdStr} />
      </Suspense>

      {/* Bottom-of-page ad — min-h reserves space before AdSense loads to
          prevent CLS. Slot 9397002286 is a responsive display unit. */}
      <div className="min-h-[90px]">
        <AdsUnit slot="9397002286" />
      </div>
    </div>
  );
}
