"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Static fallback — used until the API responds or if it fails
const STATIC_TAGS = [
  "Characters", "Gaming", "Anime", "Games", "Education", "Fun",
  "Vocabulary", "Music", "Travel", "Multiplayer", "Sports",
  "Movies", "Fashion", "Cities", "Challenge", "Cooking",
  "Food", "Fitness", "Family", "Relationships", "Phonics",
  "Lifestyle", "Math", "Science",
].map((t) => ({ name: t.toLowerCase().replace(/\s+/g, "-"), label: t, type: "popular" }));

export default function TagsCarousel() {
  const quickLinks = [{ label: "All", href: "/tags" }];

  const [tags, setTags] = useState(STATIC_TAGS);

  useEffect(() => {
    fetch("/api/trending-tags")
      .then((res) => res.json())
      .then((data) => {
        if (data.tags?.length > 0) setTags(data.tags);
      })
      .catch(() => {
        // keep static fallback
      });
  }, []);

  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 10);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    // Re-check after a short delay to account for layout shifts
    const timer = setTimeout(handleScroll, 100);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("resize", handleScroll);
      clearTimeout(timer);
    };
  }, []);

  const scroll = (direction) => {
    const container = scrollRef.current;
    if (container) {
      const scrollAmount = container.clientWidth * 0.7;
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative w-full bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-900 select-none overflow-hidden mt-1">
      <div className="w-full relative flex items-center py-1.5">
        
        {/* Left Shadow/Arrow */}
        <div className={`absolute left-0 top-0 bottom-0 z-20 flex items-center transition-opacity duration-300 ${showLeftArrow ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="h-full w-20 bg-gradient-to-r from-white dark:from-gray-950 via-white/80 dark:via-gray-950/80 to-transparent" />
          <button
            onClick={() => scroll("left")}
            className="absolute left-3 p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white transition-all active:scale-90 hidden md:flex"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* The Scrollable Strip */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          /* Using inline style for the most aggressive scrollbar hiding */
          style={{ 
            msOverflowStyle: 'none', 
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch' 
          }}
          className="flex overflow-x-auto gap-1.5 px-3 md:px-6 items-center h-full [&::-webkit-scrollbar]:hidden"
        >
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="whitespace-nowrap px-3 md:px-4 py-1.5 text-xs font-semibold rounded-full
                         bg-blue-600 text-white
                         hover:bg-blue-700
                         transition-all duration-200 flex-shrink-0"
            >
              {link.label}
            </Link>
          ))}

          {tags.map((tag, index) => (
            <Link
              key={`${tag.name}-${index}`}
              href={`/tags/${tag.name}`}
              className={`whitespace-nowrap px-3 md:px-4 py-1.5 text-xs font-semibold rounded-full
                         transition-all duration-200 flex-shrink-0
                         ${tag.type === "seasonal"
                           ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-500 hover:text-white dark:hover:bg-orange-500"
                           : tag.type === "trending"
                           ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white"
                           : "bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white"
                         }`}
            >
              {tag.type === "seasonal" && "🔥 "}
              {tag.label}
            </Link>
          ))}
          {/* Invisible spacer to ensure right-side padding works */}
          <div className="flex-shrink-0 w-4 md:w-8 h-1" />
        </div>

        {/* Right Shadow/Arrow */}
        <div className={`absolute right-0 top-0 bottom-0 z-20 flex items-center transition-opacity duration-300 ${showRightArrow ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <div className="h-full w-20 bg-gradient-to-l from-white dark:from-gray-950 via-white/80 dark:via-gray-950/80 to-transparent" />
          <button
            onClick={() => scroll("right")}
            className="absolute right-3 p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-600 hover:text-white transition-all active:scale-90 hidden md:flex"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
