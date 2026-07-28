import { cache, Suspense } from "react";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { notFound } from "next/navigation";
import { ensureArrayOfObjects } from "@utils/HelperFunctions";
import { getRelatedTopicPages } from "@components/actions/actions";
import dynamic from "next/dynamic";
import WheelInfoStatic from "@components/WheelInfoStatic";
import Description from "@components/description/Description";
import UniversalCommentsSection from "@components/UniversalCommentsSection";
import ViewTracker from "@components/ViewTracker";
import SidebarDiscovery from "@components/SidebarDiscovery";
import { getWheelUrl } from "@utils/UrlHandler";
import { connectMongoDB } from "@/lib/mongodb";
import Wheel from "@models/wheel";
import mongoose from "mongoose";
import {
  SuspendedInfoActions,
  SuspendedHubFeed,
  InfoActionsSkeleton,
  HubFeedSkeleton,
} from "@components/WheelPageSections";

// AdsUnit has no SEO value so ssr:false removes it from the HTML entirely.
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), {
  ssr: false,
});

// ISR: revalidate once a week.
export const revalidate = 604800; // 7 days

/**
 * React.cache() dedupes the identifier lookup between generateMetadata and the body.
 * This unified function handles both MongoDB ObjectIds and SEO Slugs.
 */
const getCachedPageDataByIdentifier = cache(async (identifier) => {
  await connectMongoDB();

  let wheel = null;

  // 1. If it's a valid MongoDB ID, try to fetch by ID first
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    wheel = await Wheel.findById(identifier).lean();
  }

  // 2. If not found by ID (or not a valid ID), try to fetch by slug (Admin Slugs / SEO Slugs)
  if (!wheel) {
    wheel = await Wheel.findOne({ slug: identifier }).lean();
  }

  if (!wheel) return null;

  // STRUCTURE: Standardize the object for the UI
  const pageData = {
    title: wheel.title,
    description: wheel.description,
    content: wheel.content || [],
    wheel: {
      ...wheel,
      _id: wheel._id.toString(),
    },
    isUserWheel: !wheel.indexed,
  };

  const resolvedTopics = await getRelatedTopicPages(wheel.relatedTopics);
  return { ...pageData, _relatedTopicDocs: resolvedTopics };
});

export async function generateMetadata({ params }) {
  const { id: identifier } = await params;
  const pageData = await getCachedPageDataByIdentifier(identifier);

  if (!pageData || !pageData.wheel) {
    return {
      title: "Wheel Not Found",
      robots: "noindex",
    };
  }

  const metaTitle = pageData.isUserWheel 
    ? `${pageData.title} Picker Wheel`
    : pageData.title;

  const isIndexed = pageData.wheel.indexed;

  const metadata = {
    title: metaTitle,
    description: pageData.description,
    alternates: {
      canonical: `https://www.spinpapa.com${getWheelUrl(pageData.wheel)}`,
    },
    robots: {
      index: !!isIndexed,
      follow: true,
    }
  };

  if (pageData.wheel?.wheelPreview) {
    metadata.openGraph = {
      title: metaTitle,
      description: pageData.description,
      type: "website",
      images: [{ url: pageData.wheel.wheelPreview, width: 640, height: 640, alt: metaTitle }],
    };
    metadata.twitter = {
      card: "summary_large_image",
      title: metaTitle,
      description: pageData.description,
      images: [pageData.wheel.wheelPreview],
    };
  }

  return metadata;
}

/**
 * Pre-generate the most popular SEO slugs and IDs for better performance.
 */
export async function generateStaticParams() {
  try {
    await connectMongoDB();
    
    // Fetch both popular indexed wheels (by slug) and a set of popular wheels by ID
    const wheels = await Wheel.find({ indexed: true })
      .sort({ likeCount: -1, createdAt: -1 })
      .limit(300)
      .select("slug _id")
      .lean();
    
    const params = [];
    
    wheels.forEach(wheel => {
      // Add Slug entry if it exists
      if (wheel.slug) {
        params.push({
          id: wheel.slug,
          slug: []
        });
      }
      
      // Add ID entry
      params.push({
        id: wheel._id.toString(),
        slug: []
      });
    });

    return params;
  } catch (err) {
    console.error("generateStaticParams (/wheels/[id]/[[...slug]]) failed:", err);
    return [];
  }
}

export default async function UnifiedWheelPage({ params }) {
  const resolvedParams = await params;
  const { id: identifier } = resolvedParams;
  // Optional path suffix /wheels/xyz/some-text-here
  const urlSlugSuffix = resolvedParams.slug?.[0] || "";

  const pageData = await getCachedPageDataByIdentifier(identifier);

  if (!pageData || !pageData.wheel) {
    notFound(); 
  }

  const wheelIdStr = pageData.wheel._id.toString();
  const resolvedDocs = pageData._relatedTopicDocs || { direct: [], secondary: [] };
  const displayTopics = resolvedDocs.direct || [];
  const sidebarTopics = [...displayTopics, ...(resolvedDocs.secondary || [])];

  return (
    <div className="flex flex-col">
      <ViewTracker wheelId={wheelIdStr} />
      
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
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            ...(pageData.wheel.wheelPreview && { image: pageData.wheel.wheelPreview })
          }),
        }}
      />

      <div className="relative">
        <Suspense
          fallback={<div className="rounded-2xl bg-muted/50 border border-border w-full min-h-[30rem] animate-pulse" />}
        >
          <WheelWithInputContentEditable
            newSegments={ensureArrayOfObjects(pageData.wheel.data)}
            wheelPresetSettings={pageData.wheel.wheelData}
            relatedWheelsSlot={<SidebarDiscovery initialTopics={sidebarTopics} isTrending={false} />}
            wheelId={wheelIdStr}
          />
        </Suspense>
      </div>

      <WheelInfoStatic wordsList={pageData.wheel} />

      <Suspense fallback={<InfoActionsSkeleton />}>
        <SuspendedInfoActions
          wheelId={wheelIdStr}
          wheelTitle={pageData.wheel.title}
          wheelEntityType="wheel"
          wheelSlug={pageData.wheel.slug || urlSlugSuffix} 
          createdAt={pageData.wheel.createdAt}
          createdBy={pageData.wheel.createdBy}
          authorHandle={pageData.wheel.authorHandle}
        />
      </Suspense>

      <div className="w-full px-3 text-left">
        <Description 
          pageData={pageData} 
          wordsList={pageData.wheel} 
          tags={pageData.wheel.tags} 
          relatedTopics={displayTopics}
          isTrendingTopics={false}
        />
      </div>

      <UniversalCommentsSection entityId={wheelIdStr} entityType="wheel" />

      <div className="min-h-[90px]">
        <AdsUnit slot="4694567949" />
      </div>

      <Suspense fallback={<HubFeedSkeleton />}>
        <SuspendedHubFeed 
          tags={pageData.wheel.tags} 
          currentWheelId={wheelIdStr} 
        />
      </Suspense>
    </div>
  );
}