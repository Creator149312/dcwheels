"use client";

import { Activity, Loader2, ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useFeedCache } from "@/hooks/useFeedCache";
import PostCard from "@components/PostCard";
import WheelFeedCard from "@components/WheelFeedCard";
import ListShelf from "@components/feed/ListShelf";
import TopicFeedCard from "@components/feed/TopicFeedCard";
import VirtualizedFeed from "@components/feed/VirtualizedFeed";
import { getFeedItemKey, buildStandardFeed, applyWarmOrder } from "@/utils/feedUtils";
import { getAffinityShares } from "@/utils/affinity";
import dynamic from "next/dynamic";

// Reserve the ad's height before its chunk loads so the feed doesn't jump.
const AdsUnit = dynamic(() => import("@components/ads/AdsUnit"), {
  ssr: false,
  loading: () => <div className="w-full my-2 sm:my-6" style={{ minHeight: 250 }} />,
});

const FEED_LAYOUT = { adInterval: 6, wheelCadence: 4, listPosition: 2, topicPosition: 5 };
const EMPTY_RELATED = [];

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

function RelatedTopicCarousel({ title = "Recommended for You", relatedPages = [] }) {
  const scrollRef = useRef(null);
  const [arrows, setArrows] = useState({ left: false, right: true });

  const updateArrows = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setArrows({
      left: scrollLeft > 10,
      right: scrollLeft < scrollWidth - clientWidth - 10,
    });
  };

  useEffect(() => {
    updateArrows();
    const timer = setTimeout(updateArrows, 100);
    window.addEventListener("resize", updateArrows);
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener("scroll", updateArrows);

    return () => {
      window.removeEventListener("resize", updateArrows);
      scrollEl?.removeEventListener("scroll", updateArrows);
      clearTimeout(timer);
    };
  }, [relatedPages]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!relatedPages || relatedPages.length === 0) return null;

  return (
    <div className="relative group/carousel my-2 bg-muted/20 border-y sm:border border-border/40 sm:rounded-2xl py-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 px-4 sm:px-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1 h-3.5 rounded-full bg-primary inline-block" />
          <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground/50 sm:hidden">
          Swipe →
        </span>
      </div>

      <div className="relative">
        {/* Left Arrow Button */}
        {arrows.left && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 border border-border shadow-md backdrop-blur-sm hidden md:flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            aria-label="Scroll Left"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-1 px-4 sm:px-0 scroll-smooth snap-x [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {relatedPages.slice(0, 10).map((related) => (
            <div key={String(related._id)} className="snap-start flex-shrink-0">
              <RelatedTopicCard related={related} />
            </div>
          ))}
        </div>

        {/* Right Arrow Button */}
        {arrows.right && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 border border-border shadow-md backdrop-blur-sm hidden md:flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            aria-label="Scroll Right"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
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
  q = null,
  relatedPages = EMPTY_RELATED, 
  initialNextCursor = null,
  currentContextId = null
}) {
  // Use session cache hook for feed management
  const { 
    items, 
    loading: loadingMore,
    error,
    retry,
    hasMore, 
    sentinelRef
  } = useFeedCache({
    type: type || '',
    externalId: externalId ? String(externalId) : '',
    tag: tag || '',
    userId: userId || '',
    docType: docType || '',
    q: q || '',
    limit: 8,
    endpoint: '/api/feed',
    initialItems,
    initialNextCursor,
    rootMargin: '500px' // Pre-fetch next page before reaching bottom without over-fetching
  });

  // Keep a stable, layout-frozen copy of all displayed feed items with hydration-safe initial items
  const [stableItems, setStableItems] = useState(() => {
    if (initialItems && initialItems.length > 0) {
      // No warm ordering here: localStorage differs server vs client → hydration mismatch.
      return buildStandardFeed(initialItems, FEED_LAYOUT);
    }
    return [];
  });

  const processedIdsRef = useRef(new Set(initialItems ? initialItems.map(item => item._id || item.id) : []));
  // Running count of content slots (excluding ad markers) so batches continue the cadence.
  const slotCountRef = useRef(null);
  if (slotCountRef.current === null) {
    slotCountRef.current = stableItems.filter((it) => !it.isAdMarker).length;
  }

  useEffect(() => {
    if (items.length === 0) {
      setStableItems([]);
      processedIdsRef.current.clear();
      slotCountRef.current = 0;
      return;
    }

    // Capture ONLY raw items that have not been compiled into stable layout yet
    const newRawItems = items.filter(item => !processedIdsRef.current.has(item._id || item.id));
    if (newRawItems.length === 0) return;

    newRawItems.forEach(item => processedIdsRef.current.add(item._id || item.id));

    const shares = type === "global" || !type ? getAffinityShares() : null;
    const ordered = shares ? applyWarmOrder(newRawItems, shares) : newRawItems;
    const batch = buildStandardFeed(ordered, { ...FEED_LAYOUT, slotOffset: slotCountRef.current });
    slotCountRef.current += batch.filter((it) => !it.isAdMarker).length;

    // Append-only: rendered rows never move, so the scroll position never jumps.
    setStableItems(prev => [...prev, ...batch]);
  }, [items, type]);

  // Listen for instant client-side post creation events to prepend to the live feed
  useEffect(() => {
    const handleNewPost = (e) => {
      const newPost = e.detail;
      if (!newPost || !newPost._id) return;
      if (processedIdsRef.current.has(newPost._id)) return;
      processedIdsRef.current.add(newPost._id);

      const formattedPost = {
        ...newPost,
        docType: "post",
        likeCount: 0,
        commentCount: 0,
        createdAt: new Date().toISOString(),
      };

      setStableItems(prev => [formattedPost, ...prev]);
    };

    window.addEventListener("spinpapa:postCreated", handleNewPost);
    return () => window.removeEventListener("spinpapa:postCreated", handleNewPost);
  }, []);

  const renderItem = useCallback((item, index) => {
    const showRecommendations = index === 2 && relatedPages.length > 0;

    if (item.isAdMarker) {
      return <AdsUnit slot="4694567949" />;
    }

    return (
      <>
        {showRecommendations && (
          <RelatedTopicCarousel title="Recommended for You" relatedPages={relatedPages} />
        )}

        {item.docType === "post" ? (
          <PostCard post={item} currentContextId={currentContextId} />
        ) : item.docType === "wheel" ? (
          <WheelFeedCard wheel={item} />
        ) : item.docType === "list" ? (
          <ListShelf list={item} />
        ) : item.docType === "topic" ? (
          <TopicFeedCard topic={item} />
        ) : null}
      </>
    );
  }, [relatedPages, currentContextId]);

  if (!items || items.length === 0) {
    if (error && !loadingMore) {
      return (
        <div className="rounded-xl border border-border bg-muted/30 p-12 text-center text-muted-foreground mt-4">
          <p className="text-sm font-medium text-foreground">Couldn&apos;t load this feed.</p>
          <button
            type="button"
            onClick={retry}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition"
          >
            <RotateCw size={13} /> Tap to retry
          </button>
        </div>
      );
    }

    return (
      <div className="w-full">
        {/* Soft hint with the Carousel if feed is empty */}
        {relatedPages.length > 0 && (
          <RelatedTopicCarousel title="You Might Also Like" relatedPages={relatedPages} />
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

  return (
    <div className="flex flex-col space-y-0 sm:space-y-6 sm:mt-6 max-w-2xl border-border">
      <VirtualizedFeed
        items={stableItems}
        renderItem={renderItem}
        overscan={2}
        rootMargin="500px"
        minHeight={420}
      />

      {/* Loading States & Sentinel */}
      {error && !loadingMore ? (
        <div className="flex flex-col items-center gap-2 p-8 min-h-[100px] text-muted-foreground">
          <span className="text-xs font-medium">Couldn&apos;t load more right now.</span>
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border bg-card text-xs font-bold text-foreground hover:bg-muted transition"
          >
            <RotateCw size={13} /> Tap to retry
          </button>
        </div>
      ) : (hasMore || loadingMore) && (
        <div ref={sentinelRef} className="flex justify-center p-8 min-h-[100px]">
          {loadingMore && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs font-medium">Brewing more content...</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && !error && items.length > 0 && (
        <div className="text-center py-12 px-4 border-t border-dashed border-border mt-4">
          <p className="text-muted-foreground/60 text-xs font-medium italic">
            You&apos;ve reached the end of this feed.
          </p>
        </div>
      )}
    </div>
  );
}
