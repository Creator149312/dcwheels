import { Suspense, cache } from "react";
import dynamic from "next/dynamic";
import { getWheelMeta } from "@components/actions/actions";
import { getPublicSpinStoriesForWheel } from "@lib/spinStories";
import { getFeedItemsSafe } from "@/lib/feedService";
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
 * SuspendedHubFeed — brings a unified hub feed directly underneath the fold.
 *
 * Strategy:
 *   1. Prefer content related to the wheel's tags.
 *   2. If the wheel has no tags or the tag query returns nothing, fall back
 *      to trending public wheels so user-created wheels still have a feed.
 *   3. Exclude the current wheel from the results.
 */
export async function SuspendedHubFeed({ tags = [], currentWheelId = null }) {
  const limit = 8;
  const tagString = tags && tags.length > 0 ? tags.join(",") : "";

  let initialItems = [];

  if (tagString) {
    initialItems = await getFeedItemsSafe({
      tag: tagString,
      limit: limit + 2, // extra for cursor probe + current-wheel exclusion
      docType: "post,wheel",
    });
  }

  // Fallback for user-created wheels with no tags or sparse tag results.
  if (initialItems.length < 3) {
    const trending = await getFeedItemsSafe({
      limit: limit + 2,
      docType: "wheel",
    });
    // Merge without duplicates (tag results take priority).
    const seen = new Set(initialItems.map((i) => String(i._id || i.id)));
    for (const item of trending) {
      const id = String(item._id || item.id);
      if (!seen.has(id)) {
        seen.add(id);
        initialItems.push(item);
      }
    }
  }

  // Exclude the current wheel from its own feed.
  initialItems = initialItems.filter(
    (item) => String(item._id || item.id) !== String(currentWheelId)
  );

  const nextItem = initialItems.length > limit ? initialItems[limit] : null;
  const nextCursor = nextItem ? `${nextItem.createdAt}|${nextItem._id || nextItem.id}` : null;
  const items = initialItems.slice(0, limit);

  if (items.length === 0) return null;

  return (
    <div className="w-full px-0 sm:px-4 text-left mt-6 md:mt-12 pb-20 border-t border-border/10 pt-6 md:pt-12 bg-card/5">
      <InfiniteFeedStream
        tag={tagString || undefined}
        initialItems={items}
        initialNextCursor={nextCursor}
        docType="post,wheel"
        currentContextId={currentWheelId}
      />
    </div>
  );
}
