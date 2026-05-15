"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Seasonal event tags (month-based)
const SEASONAL = {
  1: ["new-year"],
  2: ["valentines"],
  3: ["ipl", "cricket"],
  4: ["ipl", "cricket"],
  5: ["ipl"],
  6: ["fifa", "summer"],
  7: ["summer"],
  8: ["back-to-school"],
  9: ["back-to-school"],
  10: ["halloween"],
  11: ["thanksgiving", "black-friday"],
  12: ["christmas", "new-year"],
};

// Core static tags in priority order
const CORE_TAGS = [
  "Games",
  "Sports",
  "Weather",
  "Movies",
  "Fashion",
  "Shopping",
  "Characters",
  "Anime",
  "Education",
  "Vocabulary",
  "Music",
  "Travel",
  "Multiplayer",
  "Cities",
  "Challenge",
  "Cooking",
  "Food",
  "Fitness",
  "Family",
  "Relationships",
  "Phonics",
  "Lifestyle",
  "Math",
  "Science",
  "Finance",
];

const getTagColor = (type) => {
  if (type === "seasonal")
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500";
  return "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600";
};

export default function TagsCarousel() {
  const scrollRef = useRef(null);
  const [arrows, setArrows] = useState({ left: false, right: true });

  const tags = useMemo(() => {
    const month = new Date().getMonth() + 1;
    const seasonalNames = SEASONAL[month] || [];
    const seasonalSet = new Set(seasonalNames);

    const result = seasonalNames.map((name) => ({
      name,
      label: name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      type: "seasonal",
    }));

    for (const tag of CORE_TAGS) {
      const name = tag.toLowerCase().replace(/\s+/g, "-");
      if (!seasonalSet.has(name)) {
        result.push({ name, label: tag, type: "popular" });
      }
    }
    return result;
  }, []);

  const updateArrows = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setArrows({
      left: scrollLeft > 10,
      right: scrollLeft < scrollWidth - clientWidth - 10,
    });
  };

  useEffect(() => {
    updateArrows();
    const timer = setTimeout(updateArrows, 100);
    window.addEventListener("resize", updateArrows);
    const scrollEl = scrollRef.current;
    scrollEl?.addEventListener("scroll", updateArrows);

    return () => {
      window.removeEventListener("resize", updateArrows);
      scrollEl?.removeEventListener("scroll", updateArrows);
      clearTimeout(timer);
    };
  }, []);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left:
        direction === "left"
          ? -scrollRef.current.clientWidth * 0.7
          : scrollRef.current.clientWidth * 0.7,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative w-full bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-900 select-none overflow-hidden sm:mt-1">
      <div className="w-full relative flex items-center py-1.5">
        {/* Left Arrow */}
        {arrows.left && (
          <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pointer-events-none">
            <div className="h-full w-20 bg-gradient-to-r from-white dark:from-gray-950 to-transparent" />
            <button
              onClick={() => scroll("left")}
              className="absolute left-3 p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white hidden md:flex pointer-events-auto"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        )}

        {/* Scrollable Strip */}
        <div
          ref={scrollRef}
          style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          className="flex overflow-x-auto gap-1.5 mt-1 px-3 md:px-6 [&::-webkit-scrollbar]:hidden"
        >
          <Link
            href="/tags"
            className="whitespace-nowrap px-3 md:px-4 py-1.5 text-xs font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0"
          >
            All
          </Link>

          {tags.map((tag, i) => (
            <Link
              key={`${tag.name}-${i}`}
              href={`/tags/${tag.name}`}
              className={`whitespace-nowrap px-3 md:px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex-shrink-0 ${getTagColor(tag.type)}`}
            >
              {tag.type === "seasonal" && "🔥 "}
              {tag.label}
            </Link>
          ))}
          <div className="flex-shrink-0 w-4 md:w-8 h-1" />
        </div>

        {/* Right Arrow */}
        {arrows.right && (
          <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pointer-events-none">
            <div className="h-full w-20 bg-gradient-to-l from-white dark:from-gray-950 to-transparent" />
            <button
              onClick={() => scroll("right")}
              className="absolute right-3 p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white hidden md:flex pointer-events-auto"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
