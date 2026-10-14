import { FeedSkeleton } from "@app/(content)/_shared/SuspendedSections";

export function SpotlightRailSkeleton() {
  return (
    <section className="mb-4 sm:mb-6">
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-3.5 h-3.5 rounded-full bg-muted/60 animate-pulse" />
        <div className="h-4 w-44 bg-muted/60 rounded animate-pulse" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col bg-background/80 rounded-xl overflow-hidden border border-border/50 shadow-sm"
          >
            <div className="aspect-[3/4] w-full bg-muted/60 animate-pulse" />
            <div className="p-2 sm:p-2.5 space-y-1.5">
              <div className="h-3.5 w-3/4 bg-muted/60 rounded animate-pulse" />
              <div className="h-2.5 w-1/3 bg-muted/50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ComposerSkeleton() {
  return (
    <div className="mb-4 border-y sm:border border-border/50 bg-background sm:rounded-2xl p-3 sm:p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted/60 animate-pulse shrink-0" />
        <div className="h-9 flex-1 rounded-full bg-muted/50 animate-pulse" />
      </div>
    </div>
  );
}

export default function TopicListLoading() {
  return (
    <div className="mx-auto max-w-2xl px-0 py-2 sm:py-6">
      {/* 1. 4-Card Spotlight Rail Skeleton */}
      <div className="px-3 sm:px-0">
        <SpotlightRailSkeleton />
      </div>

      {/* 2. Composer Teaser Skeleton */}
      <ComposerSkeleton />

      {/* 3. Feed Stream Skeleton */}
      <FeedSkeleton />
    </div>
  );
}
