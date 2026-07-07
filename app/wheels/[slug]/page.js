import { cache, Suspense } from "react";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { redirect } from "next/navigation";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getPageDataBySlug, getRelatedTopicPages } from "@components/actions/actions";
import dynamic from "next/dynamic";
import WheelInfoStatic from "@components/WheelInfoStatic";
import Description from "@components/description/Description";
import ViewTracker from "@components/ViewTracker";
import RelatedTopicLinks from "@components/RelatedTopicLinks";
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

// ISR: revalidate once a week.
export const revalidate = 604800; // 7 days

// Pre-render the highest-value admin pages at build time.
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
      { $addFields: { _likeCount: { $ifNull: ["$wheel.likeCount", 0] } } },
      { $sort: { _likeCount: -1, createdAt: -1 } },
      { $limit: 300 },
      { $project: { slug: 1 } },
    ]);
    return rows.filter((p) => p.slug).map((p) => ({ slug: p.slug }));
  } catch (err) {
    console.error("generateStaticParams (/wheels) failed:", err);
    return [];
  }
}

// React.cache() dedupes the slug lookup between generateMetadata and the body.
const getCachedPageData = cache(async (slug) => {
  const pageData = await getPageDataBySlug(slug);
  if (!pageData || !pageData.wheel) return pageData;

  const resolvedTopics = await getRelatedTopicPages(pageData.wheel.relatedTopics);

  return { ...pageData, _relatedTopicDocs: resolvedTopics };
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

  // Extract pre-fetched topics resolved in the cache layer
  const relatedTopics = pageData._relatedTopicDocs || [];

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
        <Suspense
          fallback={
            <div className="rounded-2xl bg-muted/50 border border-border w-full min-h-[30rem] animate-pulse" />
          }
        >
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
        </Suspense>
      </div>

      {/* h1 title — Server Component, arrives in first HTML flush (LCP) */}
      <WheelInfoStatic wordsList={pageData.wheel} />

      {/* Creator + stats + action buttons — own Suspense directly below title */}
      <Suspense fallback={<InfoActionsSkeleton />}>
        <SuspendedInfoActions
          wheelId={wheelIdStr}
          wheelTitle={pageData.wheel.title}
          wheelEntityType="wheel"
          wheelSlug={slug}
          createdAt={pageData.wheel.createdAt}
          createdBy={pageData.wheel.createdBy}
          authorHandle={pageData.wheel.authorHandle}
        />
      </Suspense>

      {/* Tags — static, render instantly with no DB wait */}
      {Array.isArray(pageData.wheel.tags) && pageData.wheel.tags.length > 0 && (
        <div className="w-full px-4 flex flex-wrap gap-1.5 mt-2 mb-3 text-left">
          {pageData.wheel.tags.map((tag) => (
            <a
              key={tag}
              href={`/tags/${encodeURIComponent(tag)}`}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              #{tag}
            </a>
          ))}
        </div>
      )}

      {/* Associated TopicPage links — helps with the "Source of Truth" linking */}
      {relatedTopics.length > 0 && (
        <div className="w-full px-4 mb-3">
          <RelatedTopicLinks topics={relatedTopics} />
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
