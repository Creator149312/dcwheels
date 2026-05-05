"use client";

import { useState } from "react";
import { TbLoader, TbMoodEmpty } from "react-icons/tb";
import AskCard from "@components/AskCard";

export default function AskFeedClient({ initialAsks = [] }) {
  const [asks, setAsks] = useState(initialAsks);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(initialAsks.length);
  const [hasMore, setHasMore] = useState(initialAsks.length >= 20);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/ask?limit=20&skip=${skip}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.asks?.length) {
          setAsks((prev) => [...prev, ...data.asks]);
          setSkip((prev) => prev + data.asks.length);
          if (data.asks.length < 20) setHasMore(false);
        } else {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error("Failed to load more asks:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (asks.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#1a1a1a] p-12 text-center text-gray-500 dark:text-gray-400">
        <TbMoodEmpty className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">No dilemmas yet!</p>
        <p className="text-sm mt-2 max-w-xs mx-auto">
          Be the first to post a decision you need help with.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {asks.map((ask) => (
        <AskCard key={ask.id} ask={ask} compact />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all shadow-sm
              bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300
              dark:bg-[#1a1a1a] dark:text-gray-300 dark:border-gray-800 dark:hover:bg-[#222] dark:hover:border-gray-700
              focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <><TbLoader className="h-5 w-5 animate-spin" /> Loading...</>
            ) : (
              "Load More Dilemmas"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
