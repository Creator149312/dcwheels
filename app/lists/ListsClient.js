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
    <div className="px-4 py-3 md:px-6 md:py-4 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
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
              className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition"
            >
              {/* ✅ Cover Image */}
              <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {cover ? (
                  <img
                    src={cover}
                    alt={list.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 dark:text-gray-500 text-4xl font-bold">
                    {list.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* ✅ Text Content */}
              <div className="p-2.5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
                  {list.name}
                </h3>

                {/* <p className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {list.description || "No description"}
                </p> */}

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {list.itemCount ?? list.items?.length ?? 0} items
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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
