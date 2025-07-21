"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function TagsPage() {
  const [tags, setTags] = useState([]);

  // Load top tags
  useEffect(() => {
    fetch("/api/tags-data")
      .then((res) => res.json())
      .then((data) => {
        setTags(data.tags || []);
      })
      .catch((err) => console.error("Failed to fetch tags", err));
  }, []);

  return (
    <div className="px-4 py-4 max-w-full mx-auto dark:bg-gray-950 min-h-screen transition-colors">
      <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
        Browse by Tag
      </h1>

      <div className="-mx-4 px-4 overflow-x-scroll whitespace-nowrap mb-6 flex gap-3 no-scrollbar snap-x">
        {tags.map((tag) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className={`px-4 py-2 border rounded-full shrink-0 text-sm snap-start transition-colors
              bg-white text-black border-gray-300 hover:bg-gray-100
              dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700`}
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
