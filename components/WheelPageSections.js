import { Suspense, cache } from "react";
import dynamic from "next/dynamic";
import { getWheelMeta } from "@components/actions/actions";
import { getPublicSpinStoriesForWheel } from "@lib/spinStories";
import { getFeedItems } from "@lib/feedService";
import WheelInfoActions from "@components/WheelInfoActions";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

const WheelStatsBar = dynamic(() => import("@components/WheelStatsBar"));
const WheelSpinFeed = dynamic(() => import("@components/WheelSpinFeed"));

// Cache getWheelMeta so SuspendedInfoActions and SuspendedStatsFeed both
// resolve from a single DB round-trip per render.
export const getCachedWheelMeta = cache(async (wheelId) => {
  return getWheelMeta(wheelId, null);
});

// ---------------------------------------------------------------------------
// Skeletons / Fallbacks
// ---------------------------------------------------------------------------

export function InfoActionsSkeleton() {
  return (
    <div className="h-14 mt-1 mx-4 rounded-lg bg-muted animate-pulse w-full text-left" />
  );
}

export function StatsFeedSkeleton() {
  return (
    <div className="h-64 mt-8 w-full bg-muted rounded-xl animate-pulse mx-4 text-left" />
  );
}

export function HubFeedSkeleton() {
  return (
    <div className="w-full px-4 space-y-6 mt-12 pb-20">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-1.5 h-6 bg-primary rounded-full" />
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-72 bg-muted/40 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Async Server Components
// ---------------------------------------------------------------------------

export async function SuspendedInfoActions({ wheelId, wheelTitle, wheelEntityType, wheelSlug, createdAt, createdBy, authorHandle }) {
  const initialMeta = await getCachedWheelMeta(wheelId);
  return (
    <WheelInfoActions
      wheelId={wheelId}
      wheelTitle={wheelTitle}
      wheelEntityType={wheelEntityType}
      wheelSlug={wheelSlug}
      createdAt={createdAt}
      createdBy={createdBy}
      authorHandle={authorHandle}
      initialMeta={initialMeta}
    />
  );
}

export async function SuspendedStatsFeed({ wheelId }) {
  const [initialMeta, initialStories] = await Promise.all([
    getCachedWheelMeta(wheelId), // deduped — same call as SuspendedInfoActions
    getPublicSpinStoriesForWheel(wheelId, 10),
  ]);
  return (
    <div className="w-full px-4 text-left">
      <WheelStatsBar
        wheelId={wheelId}
        initialStats={initialMeta?.analytics}
      />
      <WheelSpinFeed wheelId={wheelId} initialStories={initialStories} />
    </div>
  );
}

/**
 * SuspendedHubFeed — brings the specific hub feed directly underneath the fold.
 * Fetches content related to the wheel's tags.
 */
export async function SuspendedHubFeed({ tags = [], currentWheelId = null }) {
  if (!tags || tags.length === 0) return null;

  // Convert array to comma-separated string for the unified feed fetcher
  const tagString = tags.join(",");

  const limit = 8;
  const initialItems = await getFeedItems({
    tag: tagString,
    limit: limit + 1, // Fetch one extra to check for more
    docType: "post,wheel"
  });

  const nextCursor = initialItems.length > limit 
    ? initialItems[limit - 1].createdAt 
    : null;
  const items = initialItems.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <div className="w-full px-0 sm:px-4 text-left mt-6 md:mt-12 pb-20 border-t border-border/10 pt-6 md:pt-12 bg-card/5">
      {/* <div className="px-3 sm:px-0 flex items-center gap-2 mb-4 group">
        <span className="w-1.5 h-5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.3)]" />
        <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-foreground">
          Explore the Hub
        </h2>
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-bold text-muted-foreground ml-2 opacity-50">
          RELATED CONTENT
        </span>
      </div> */}
      
      <InfiniteFeedStream
        tag={tagString}
        initialItems={items}
        initialNextCursor={nextCursor}
        docType="post,wheel"
      />
    </div>
  );
}
