"use client";

import { useState, useEffect } from "react";
import TopicSidebar from "./TopicSidebar";
import { getTrendingTopicPages } from "./actions/actions";

export default function SidebarDiscovery({ initialTopics = [], isTrending = false }) {
  const [topics, setTopics] = useState(initialTopics);
  const [trending, setTrending] = useState(isTrending);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch fallback on desktop (lg: matchMedia)
    const isDesktop = typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;

    async function loadFallback() {
      if (isDesktop && topics.length === 0 && !loading) {
        setLoading(true);
        try {
          const fallback = await getTrendingTopicPages(9);
          if (fallback && fallback.length > 0) {
            setTopics(fallback);
            setTrending(true);
          }
        } catch (err) {
          console.error("Discovery fallback failed", err);
        } finally {
          setLoading(false);
        }
      }
    }

    loadFallback();
  }, [topics.length, loading]);

  // If we have nothing to show and aren't loading, stay hidden
  if (topics.length === 0 && !loading) return null;

  return (
    <div className={`transition-opacity duration-300 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
      <TopicSidebar topics={topics} isTrending={trending} />
      {loading && (
        <div className="space-y-3 p-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-11 h-11 rounded-lg bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/5 rounded w-3/4" />
                <div className="h-2 bg-white/5 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
