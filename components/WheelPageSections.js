import { Suspense, cache } from "react";
import dynamic from "next/dynamic";
import { getRelatedWheelsByTags, getWheelMeta } from "@components/actions/actions";
import { getPublicSpinStoriesForWheel } from "@lib/spinStories";
import RelatedWheels from "@components/RelatedWheels";
import WheelInfoActions from "@components/WheelInfoActions";

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

export function RelatedWheelsSkeleton() {
  return (
    <aside className="hidden lg:block w-full p-3">
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-xl">
            <div className="w-9 h-9 rounded-lg bg-muted animate-pulse flex-shrink-0" />
            <div className="w-full h-4 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </aside>
  );
}

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

// ---------------------------------------------------------------------------
// Async Server Components
// ---------------------------------------------------------------------------

export async function SuspendedRelatedWheels({ tags, wheelId }) {
  const relatedWheels =
    tags?.length > 0 ? await getRelatedWheelsByTags(tags, wheelId) : [];
  return <RelatedWheels relatedWheels={relatedWheels} />;
}

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
