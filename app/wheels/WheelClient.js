"use client";

import { useState } from "react";
import Link from "next/link";

export default function WheelsClient({ initialWheels }) {
  const [wheels, setWheels] = useState(initialWheels);
  const [skip, setSkip] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialWheels.length === 20);

  // ✅ Load More handler
  async function loadMore() {
    setLoading(true);

    const res = await fetch(`/api/page/all?limit=20&skip=${skip}`);
    const data = await res.json();

    const newWheels = data.wheels || [];

    setWheels((prev) => [...prev, ...newWheels]);
    setSkip((prev) => prev + 20);

    if (newWheels.length < 20) {
      setHasMore(false);
    }

    setLoading(false);
  }

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        All Wheels
      </h1>

      {/* ✅ Empty State */}
      {wheels.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-center mt-20">
          No wheels found.
        </div>
      )}

      {/* ✅ Wheels Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {wheels.map((wheel) => (
          <Link
            key={wheel._id}
            href={`/wheels/${wheel.slug}`}
            className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition"
          >
            {/* ✅ Cover Placeholder (First Letter of Title) */}
            <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500 text-4xl font-bold">
                {wheel.title?.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* ✅ Text Content */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {wheel.title}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {/* ✅ Load More Button */}
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
