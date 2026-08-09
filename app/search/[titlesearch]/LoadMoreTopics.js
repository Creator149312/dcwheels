"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SearchResultCard from "@components/search/SearchResultCard";
import SearchEmptyState from "@components/search/SearchEmptyState";
import { Loader2 } from "lucide-react";
import apiConfig from "@utils/ApiUrlConfig";

const perPage = 12;

export default function LoadMoreTopics({
  searchtitle,
  type,
  label,
  initialResults = [],
  initialMeta,
  badgeType = "star",
}) {
  const [items, setItems] = useState(initialResults);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialMeta?.hasMore ?? false);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);
  const fetchMoreRef = useRef(null);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const nextPage = page + 1;
      const url = new URL(`${apiConfig.baseUrl}/api/search/topics`);
      url.searchParams.set("q", searchtitle);
      url.searchParams.set("type", type);
      url.searchParams.set("page", String(nextPage));
      url.searchParams.set("limit", String(perPage));

      const res = await fetch(url.toString());
      const data = await res.json();
      const newItems = data.results || [];

      setItems((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(data.meta?.hasMore ?? false);
    } catch (err) {
      console.error(`Failed to load more ${type}:`, err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, searchtitle, type]);

  fetchMoreRef.current = fetchMore;

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && fetchMoreRef.current) {
          fetchMoreRef.current();
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  if (!items || items.length === 0) {
    return <SearchEmptyState query={searchtitle} label={label} />;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
        {items.map((item) => (
          <SearchResultCard
            key={item.id || item._id}
            href={`/${item.type}/${item.slug}`}
            image={item.cover}
            alt={item.title}
            title={item.title}
            badge={type === "character" ? item.worthItScore : item.rating}
            badgeType={badgeType}
            subtitle={buildSubtitle(item, type)}
          />
        ))}
      </div>

      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex justify-center w-full mt-6 md:mt-10 mb-10"
        >
          <button
            onClick={fetchMore}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black rounded-full shadow-lg shadow-primary/20 transition-transform active:scale-95 disabled:opacity-50 min-h-[44px] min-w-[160px] touch-manipulation"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>LOADING...</span>
              </>
            ) : (
              "LOAD MORE RESULTS"
            )}
          </button>
        </div>
      )}
    </>
  );
}

function buildSubtitle(item, type) {
  if (type === "character") {
    const gender = item.details?.gender || "—";
    const age = item.details?.age;
    return `${gender}${age ? ` · ${age}` : ""} · Character`;
  }

  const parts = [];
  if (item.year) parts.push(item.year);
  parts.push(item.type?.charAt(0).toUpperCase() + item.type?.slice(1));
  if (item.tags?.[0]) parts.push(item.tags[0]);
  return parts.join(" · ") || "—";
}
