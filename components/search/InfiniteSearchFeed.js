"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import PostCard from "@components/PostCard";
import ListShelf from "@components/feed/ListShelf";
import WheelFeedCard from "@components/WheelFeedCard";
import TopicFeedCard from "@components/feed/TopicFeedCard";
import { Loader2 } from "lucide-react";

export default function InfiniteSearchFeed({
  initialItems = [],
  initialHasMore = false,
  searchtitle,
  type = "top",
  pageSize = 6,
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);
  const fetchMoreRef = useRef(null);
  const skipRef = useRef(initialItems.length);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const url = new URL("/api/search/feed", window.location.origin);
      url.searchParams.set("q", searchtitle);
      url.searchParams.set("type", type);
      url.searchParams.set("skip", String(skipRef.current));
      url.searchParams.set("limit", String(pageSize));

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load more results");

      const data = await res.json();
      const newItems = data.items || [];

      if (newItems.length > 0) {
        setItems((prev) => [...prev, ...newItems]);
        skipRef.current += newItems.length;
      }
      setHasMore(Boolean(data.hasMore && newItems.length > 0));
    } catch (err) {
      console.error("InfiniteSearchFeed fetch error:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, searchtitle, type, pageSize]);

  fetchMoreRef.current = fetchMore;

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && fetchMoreRef.current) {
          fetchMoreRef.current();
        }
      },
      { rootMargin: "600px" } // Pre-fetches 600px before reaching the bottom
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore]);

  const renderCard = (item, index) => {
    const key = `${item.kind}-${item.data?._id || item.data?.id || index}`;
    switch (item.kind) {
      case "post":
        return <PostCard key={key} post={item.data} />;
      case "list":
        return <ListShelf key={key} list={item.data} />;
      case "wheel":
        return <WheelFeedCard key={key} wheel={item.data} />;
      case "topic":
        return <TopicFeedCard key={key} topic={item.data} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => renderCard(item, index))}

      {hasMore && (
        <div ref={sentinelRef} className="py-6 flex justify-center items-center">
          {loading && (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Loading more results...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
