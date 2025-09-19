"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MdTrendingUp } from "@node_modules/react-icons/md";

export default function RightSidebar({ pageIds = [] }) {
  const [pages, setPages] = useState([]);

  useEffect(() => {
    if (pageIds.length > 0) {
      fetch(`/api/trending?ids=${pageIds.join(",")}`)
        .then((res) => res.json())
        .then((data) => setPages(data))
        .catch((err) => console.error("Failed to fetch pages:", err));
    }
  }, [pageIds]);

  return (
    <aside className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-screen sticky top-0 overflow-y-auto p-4">
      <h2 className="flex items-center text-lg font-semibold mb-4 dark:text-gray-100">
        <span className="pr-4">Trending Pages </span><MdTrendingUp size={24}/>
      </h2>

      <div className="flex flex-col gap-3">
        {pages.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No trending pages found.
          </p>
        ) : (
          pages.map((page) => (
            <Link
              key={page._id}
              href={`/wheels/${page.slug}`}
              className="group p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <p className="text-sm font-medium dark:text-gray-100 group-hover:underline">
                {page.title}
              </p>
            </Link>
          ))
        )}
      </div>
    </aside>
  );
}
