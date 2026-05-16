"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookMarked } from "lucide-react";
import EmptyState from "@components/EmptyState";

export default function ListsClient({ initialLists }) {
  const searchParams = useSearchParams();
  const isContentMode = searchParams.get("mode") === "content";
  const [lists, setLists] = useState(initialLists);
  const [skip, setSkip] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialLists.length === 20);

  async function loadMore() {
    setLoading(true);

    const res = await fetch(`/api/unifiedlist/all?limit=20&skip=${skip}`);
    const data = await res.json();

    const newLists = data.lists || [];

    setLists((prev) => [...prev, ...newLists]);
    setSkip((prev) => prev + 20);

    if (newLists.length < 20) {
      setHasMore(false);
    }

    setLoading(false);
  }

  // ✅ Helper to compute cover image
  function getCoverImage(list) {
    const first = list.items?.[0];
    if (!first) return null;

    if (first.type === "entity" && first.image) return first.image;

    if (first.type === "word" && first.wordData?.startsWith("data:image"))
      return first.wordData;

    return null;
  }

  return (
    <div className="px-4 py-3 md:px-6 md:py-4 min-h-screen">
      <h1 className="text-xl font-bold text-foreground mb-4">
        All Lists
      </h1>

      {isContentMode && (
        <div className="mb-4 rounded-xl border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          Select a list to spin it as a Content Wheel.
        </div>
      )}

      {lists.length === 0 && (
        <div className="mt-16">
          <EmptyState
            icon={BookMarked}
            title="No lists yet"
            description="Create a list to start collecting items you can spin into decisions."
            action={{ label: "Browse wheels", href: "/wheels" }}
          />
        </div>
      )}

      {/* ✅ Lists Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {lists.map((list) => {
          const cover = getCoverImage(list);

          return (
            <Link
              key={list.id}
              href={`/lists/${list.id}`}
              className="block bg-card border border-border shadow-sm rounded-lg overflow-hidden hover:shadow-md transition"
            >
              {/* ✅ Cover Image */}
              <div className="w-full h-32 md:h-40 bg-muted flex items-center justify-center overflow-hidden border-b border-border/50">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={list.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <span className="text-muted-foreground text-4xl font-black group-hover:scale-110 transition-transform duration-300">
                    {list.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* ✅ Text Content */}
              <div className="p-3 md:p-4 bg-card group-hover:bg-muted/30 transition-colors">
                <h3 className="text-sm md:text-base font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {list.name}
                </h3>

                <p className="text-xs font-semibold text-muted-foreground mt-1.5 uppercase tracking-widest">
                  {list.itemCount ?? list.items?.length ?? 0} item{(list.itemCount ?? list.items?.length) !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ✅ Load More */}
      {hasMore && (
        <div className="text-center mt-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
