"use client";

import { useState, Fragment, useEffect, useRef, useCallback } from "react";
import apiConfig from "@utils/ApiUrlConfig";
import { Loader2 } from "lucide-react";
import AdsUnit from "@components/ads/AdsUnit";
import WheelCard from "@components/search/WheelCard";

const perPage = 10;

export default function LoadMoreWheels({ searchtitle, initialStart, total }) {
  const [wheelList, setWheelList] = useState([]);
  const [start, setStart] = useState(initialStart);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialStart < total);
  const sentinelRef = useRef(null);
  const fetchMoreRef = useRef(null);

  const fetchMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=${start}&limit=${perPage}`,
      );
      const data = await res.json();
      const newList = data.list || [];

      setWheelList((prev) => [...prev, ...newList]);
      const nextStart = start + perPage;
      setStart(nextStart);
      setHasMore(nextStart < total);
    } catch (err) {
      console.error("Failed to load more wheels:", err);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, start, total, searchtitle]);

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

  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 md:gap-4 w-full">
        {wheelList.map((item, i) => {
          const globalIndex = initialStart + i;
          const showAd = (globalIndex + 1) % 7 === 0;

          return (
            <Fragment key={item._id || `loadmore-${i}`}>
              <WheelCard item={item} />
              {showAd && <AdsUnit slot="4694567949" />}
            </Fragment>
          );
        })}

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
      </div>
    </>
  );
}
