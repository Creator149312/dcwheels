"use client";

import { Activity, Loader2 } from "lucide-react";
import { useFeedCache } from "@/hooks/useFeedCache";
import PostCard from "@components/PostCard";
import WheelFeedCard from "@components/WheelFeedCard";
import { distributeFeedItems, getFeedItemKey, injectAdMarkers } from "@/utils/feedUtils";
import dynamic from "next/dynamic";

const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), { ssr: false });

function RelatedTopicCard({ related }) {
  const relatedTitle =
    related.title?.default ||
    related.title?.english ||
    related.title?.romaji ||
    related.title?.localized ||
    related.title?.original ||
    "Untitled";

  return (
    <a
      href={`/${related.type}/${related.slug}`}
      className="flex-shrink-0 w-28 sm:w-32 bg-background hover:bg-accent/40 border border-border/40 rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03] group flex flex-col shadow-sm"
    >
      <div className="relative aspect-[3/4] bg-muted overflow-hidden flex-shrink-0">
        {related.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={related.cover}
            alt={relatedTitle}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs text-muted-foreground/60">No Cover</span>
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col justify-between flex-1 min-w-0">
        <p className="text-[11px] sm:text-xs font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {relatedTitle}
        </p>
        <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase font-bold tracking-wider mt-1">
          {related.type}
        </p>
      </div>
    </a>
  );
}

// A reusable Infinite Feed Stream Component
export default function InfiniteFeedStream({ 
  initialItems = [], 
  type = null, 
  externalId = null, 
  tag = null, 
  userId = null,
  docType = null,
  relatedPages = [], 
  initialNextCursor = null,
  currentContextId = null
}) {
  // Use session cache hook for feed management
  const { 
    items, 
    loading: loadingMore,
    hasMore, 
    sentinelRef
  } = useFeedCache({
    type: type || '',
    externalId: externalId ? String(externalId) : '',
    tag: tag || '',
    userId: userId || '',
    docType: docType || '',
    limit: 8,
    endpoint: '/api/feed',
    initialItems,
    initialNextCursor
  });

  if (!items || items.length === 0) {
    return (
      <div className="w-full">
        {/* Soft hint with the Carousel if feed is empty */}
        {relatedPages.length > 0 && (
          <div className="my-2 bg-muted/20 border border-border/40 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <span className="w-1 h-3.5 rounded-full bg-primary inline-block" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                  You Might Also Like
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground/50">Swipe to browse →</span>
            </div>
            <div
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: "none" }}
            >
              {relatedPages.map((related) => (
                <RelatedTopicCard key={String(related._id)} related={related} />
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-muted/30 p-12 text-center text-muted-foreground mt-4">
          <Activity className="mx-auto h-10 w-10 text-muted-foreground mb-3 opacity-50" />
          <p className="text-lg font-medium text-foreground">It&apos;s quiet... too quiet.</p>
          <p className="text-sm mt-2 max-w-sm mx-auto">
            {docType === 'wheel' 
              ? "No wheels found here yet. Explore or create your first spin wheel to get started!"
              : "No discussions yet. Have a topic decision or poll? Create a post to get started!"
            }
          </p>
        </div>
      </div>
    );
  }

  const distributedItems = distributeFeedItems(items);
  const itemsWithAds = injectAdMarkers(distributedItems, 6);

  return (
    <div className="flex flex-col space-y-0 sm:space-y-6 mt-4 sm:mt-6 max-w-3xl border-t sm:border-t-0 border-border">
      {itemsWithAds.map((item, index) => {
        const key = getFeedItemKey(item, index);
        // Inject recommended topics after item index 2 (counting only content items)
        const showRecommendations = index === 2 && relatedPages.length > 0;

        if (item.isAdMarker) {
          return (
            <div key={key} className="w-full py-2 bg-muted/50 border border-border sm:rounded-xl flex flex-col items-center justify-center min-h-[90px] my-2">
              <AdsUnit slot="4694567949" />
            </div>
          );
        }

        return (
          <div key={key}>
            {showRecommendations && (
              <div className="mb-6 sm:mb-8 bg-muted/20 border-y sm:border border-border/40 sm:rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1 h-3.5 rounded-full bg-primary inline-block" />
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-muted-foreground">
                      Recommended for You
                    </h3>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground/50">Swipe to browse →</span>
                </div>
                <div
                  className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
                >
                  {relatedPages.map((related) => (
                    <RelatedTopicCard key={String(related._id)} related={related} />
                  ))}
                </div>
              </div>
            )}

            {item.docType === "post" ? (
              <PostCard post={item} currentContextId={currentContextId} />
            ) : (
              <WheelFeedCard wheel={item} />
            )}
          </div>
        );
      })}

      {/* Loading States & Sentinel */}
      {(hasMore || loadingMore) && (
        <div ref={sentinelRef} className="flex justify-center p-8 min-h-[100px]">
          {loadingMore && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-medium">Brewing more content...</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="text-center py-12 px-4 border-t border-dashed border-border mt-4">
          <p className="text-muted-foreground/60 text-xs font-medium italic">
            You&apos;ve reached the end of this feed.
          </p>
        </div>
      )}
    </div>
  );
}
