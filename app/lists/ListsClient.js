"use client";

import { useState } from "react";
import Link from "next/link";

export default function ListsClient({ initialLists }) {
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
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        All Lists
      </h1>

      {lists.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-center mt-20">
          No lists found.
        </div>
      )}

      {/* ✅ Lists Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
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
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {list.name}
                </h3>

                {/* <p className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {list.description || "No description"}
                </p> */}

                <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">
                  {list.items.length} items
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ✅ Load More */}
      {hasMore && (
        <div className="text-center mt-8">
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
