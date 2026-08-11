import { cache, Suspense } from "react";
import WheelWithInputContentEditable from "@components/WheelWithInputContentEditable";
import { notFound } from "next/navigation";
import { sessionUser } from "@utils/SessionData";
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
import WheelAnalytics from "@models/wheelAnalytics";
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

const WHEEL_PAGE_PROJECTION =
  "title description content data wheelData wheelPreview tags relatedTopics slug indexed isPublic userId createdBy createdAt updatedAt authorHandle authorName authorProfileImage likeCount commentCount";

/**
 * React.cache() dedupes the identifier lookup between generateMetadata and the body.
 * This unified function handles both MongoDB ObjectIds and SEO Slugs.
 */
const getCachedPageDataByIdentifier = cache(async (identifier) => {
  await connectMongoDB();

  let wheel = null;
  const isObjectId = mongoose.Types.ObjectId.isValid(identifier);

  if (isObjectId) {
    // ID-based URL (user wheels): try ID first, then slug fallback.
    wheel = await Wheel.findById(identifier)
      .select(WHEEL_PAGE_PROJECTION)
      .lean();
    if (!wheel) {
      wheel = await Wheel.findOne({ slug: identifier })
        .select(WHEEL_PAGE_PROJECTION)
        .lean();
    }
  } else {
    // Slug-based URL (SEO pages): query by slug directly and skip the
    // wasted ObjectId lookup. This saves one DB round-trip for every
    // indexed wheel page and improves TTFB for the crawlable URL surface.
    wheel = await Wheel.findOne({ slug: identifier })
      .select(WHEEL_PAGE_PROJECTION)
      .lean();
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

  // De-index ObjectId-based wheel URLs. Only slug-based (SEO/admin) wheels
  // should appear in search indexes. User-created wheels and any direct _id
  // links should still work for sharing, but should not be indexed.
  const requestedId = identifier?.toString() || "";
  const isIdUrl = mongoose.Types.ObjectId.isValid(requestedId);
  const isIndexed = pageData.wheel.indexed && !isIdUrl;

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

    // Only pre-render slug-based indexed wheels that have real traffic.
    // ID-based URLs (user wheels) are intentionally noindex and can be
    // server-rendered on demand. Sorting by total engagement (views +
    // spins) surfaces the wheels most likely to be searched/shared.
    const wheels = await Wheel.find({
      indexed: true,
      slug: { $exists: true, $ne: null, $type: "string" },
    })
      .select("slug")
      .lean();

    const wheelIds = wheels.map((w) => w._id);
    const analytics = await WheelAnalytics.find({
      wheel: { $in: wheelIds },
    })
      .select("wheel view_count spin_count")
      .lean();

    const scoreByWheel = new Map(
      analytics.map((a) => [
        String(a.wheel),
        (a.view_count || 0) + (a.spin_count || 0),
      ])
    );

    return wheels
      .filter((wheel) => wheel.slug && wheel.slug.trim().length > 0)
      .map((wheel) => ({
        id: wheel.slug.trim(),
        slug: [],
        score: scoreByWheel.get(String(wheel._id)) || 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 500)
      .map(({ id, slug }) => ({ id, slug }));
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

  // Privacy check: private wheels are only visible to their owner.
  // Public (isPublic !== false) and legacy wheels without the flag remain visible.
  const wheel = pageData.wheel;
  if (wheel.isPublic === false) {
    const sessionData = await sessionUser("_id email");
    const sessionUserId = sessionData?.userId ? String(sessionData.userId) : null;
    const wheelUserId = wheel.userId ? String(wheel.userId) : null;
    const ownsByUserId = wheelUserId && sessionUserId && sessionUserId === wheelUserId;
    const ownsByEmail = !wheelUserId && sessionData?.user?.email && wheel.createdBy && wheel.createdBy.toLowerCase() === sessionData.user.email.toLowerCase();
    if (!ownsByUserId && !ownsByEmail) {
      notFound();
    }
  }

  const wheelIdStr = wheel._id.toString();
  const resolvedDocs = pageData._relatedTopicDocs || { direct: [], secondary: [] };
  const displayTopics = resolvedDocs.direct || [];
  const sidebarTopics = [...displayTopics, ...(resolvedDocs.secondary || [])];

  return (
    <div className="flex flex-col max-w-7xl mx-auto w-full">
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
            wheelTitle={pageData.wheel.title}
            wheelPreview={pageData.wheel.wheelPreview}
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

      <UniversalCommentsSection
        entityId={wheelIdStr}
        entityType="wheel"
        initialCount={pageData.wheel.commentCount || 0}
        className="px-3 md:px-4"
      />

      <div className="min-h-[90px] mt-1 sm:mt-2 px-3 sm:px-4">
        <AdsUnit slot="4694567949" />
      </div>

      <div className="flex justify-center px-0 sm:px-4">
        <Suspense fallback={<HubFeedSkeleton />}>
          <SuspendedHubFeed
            tags={pageData.wheel.tags}
            currentWheelId={wheelIdStr}
          />
        </Suspense>
      </div>
    </div>
  );
}