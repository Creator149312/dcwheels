"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

export default function TagsCarousel() {
  const [tags, setTags] = useState([
    "games",
    "music",
    "movies",
    "anime",
    "challenge",
    "sports",
    "travel",
    "cooking",
    "fashion",
    "food",
    "fitness",
    "family",
    "beauty",
    "relationships",
    "education",
    "phonics",
    "vocabulary",
    "fun",
    "lifestyle",
    "math",
    "science",
  ]);
  const scrollRef = useRef(null);

  // Load tags
  // useEffect(() => {
  //   fetch("/api/tags-data")
  //     .then((res) => res.json())
  //     .then((data) => {
  //       setTags(data.tags || []);
  //     })
  //     .catch((err) => console.error("Failed to fetch tags", err));
  // }, []);

  // Scroll left or right by fixed offset
  const scroll = (direction) => {
    const container = scrollRef.current;
    if (!container) return;
    const scrollAmount = 200;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative px-2 mb-2 md:px-4 pt-3 min-h-12 max-w-full mx-auto dark:bg-gray-950 transition-colors">
      {/* Left Arrow */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 mt-1 mx-1 md:mx-2 z-10 bg-white dark:bg-gray-800 p-1 md:p-2 rounded-full shadow-md"
      >
        <HiChevronLeft className="text-lg md:text-2xl text-gray-700 dark:text-gray-200" />
      </button>

      {/* Tag Scroll Area */}
      <div ref={scrollRef} className="overflow-hidden">
        <div className="flex gap-2 md:gap-3 snap-x px-6 md:px-8">
          {tags.map((tag) => (
            <Link
              key={tag}
              href={`/tags/${encodeURIComponent(tag).toLowerCase()}`}
              className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm border rounded-full shrink-0 snap-start 
            bg-white text-black border-gray-300 hover:bg-gray-100 
            dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>

      {/* Right Arrow */}
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 mt-1 mx-1 md:mx-2 z-10 bg-white dark:bg-gray-800 p-1 md:p-2 rounded-full shadow-md"
      >
        <HiChevronRight className="text-lg md:text-2xl text-gray-700 dark:text-gray-200" />
      </button>
    </div>
  );
}
