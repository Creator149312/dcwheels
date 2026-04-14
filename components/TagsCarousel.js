"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TagsCarousel() {
  const quickLinks = [{ label: "All", href: "/tags" }];

  const [tags] = useState([
    "Characters", "Gaming", "Anime", "Games", "Education", "Fun",
    "Vocabulary", "Music", "Travel", "Multiplayer", "Sports",
    "Movies", "Fashion", "Cities", "Challenge", "Cooking",
    "Food", "Fitness", "Family", "Relationships", "Phonics",
    "Lifestyle", "Math", "Science",
  ]);

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
    <div className="relative w-full bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-900 select-none overflow-hidden">
      <div className="w-full relative flex items-center h-10">
        
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
            <a
              key={link.label}
              href={link.href}
              className="whitespace-nowrap px-3 md:px-4 py-1.5 text-xs font-semibold rounded-full
                         bg-blue-600 text-white
                         hover:bg-blue-700
                         transition-all duration-200 flex-shrink-0"
            >
              {link.label}
            </a>
          ))}

          {tags.map((tag, index) => (
            <a
              key={`${tag}-${index}`}
              href={`/tags/${tag.toLowerCase().replace(/\s+/g, "-")}`}
              className="whitespace-nowrap px-3 md:px-4 py-1.5 text-xs font-semibold rounded-full
                         bg-gray-100 dark:bg-gray-800/50 
                         text-gray-600 dark:text-gray-400
                         hover:bg-blue-600 hover:text-white
                         dark:hover:bg-blue-600 dark:hover:text-white
                         transition-all duration-200 flex-shrink-0"
            >
              {tag}
            </a>
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

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { HiChevronLeft, HiChevronRight } from "react-icons/hi";

// export default function TagsCarousel() {
//   const [tags, setTags] = useState([
//     "games",
//     "music",
//     "newyear",
//     "christmas",
//     "movies",
//     "fashion",
//     "anime",
//     "challenge",
//     "sports",
//     "travel",
//     "cooking",
//     "food",
//     "fitness",
//     "family",
//     "relationships",
//     "education",
//     "phonics",
//     "vocabulary",
//     "lifestyle",
//     "math",
//     "science",
//   ]);

//   const scrollRef = useRef(null);

//   // Scroll left or right by fixed offset
//   const scroll = (direction) => {
//     const container = scrollRef.current;
//     if (!container) return;
//     const scrollAmount = 200;
//     container.scrollBy({
//       left: direction === "left" ? -scrollAmount : scrollAmount,
//       behavior: "smooth",
//     });
//   };

//   return (
//     <div className="relative px-2 mb-1 md:px-4 pt-4 min-h-12 max-w-full mx-auto dark:bg-gray-950 transition-colors">
//       {/* Left Arrow */}
//       <button
//         onClick={() => scroll("left")}
//         className="absolute left-0 top-1/2 -translate-y-1/2 mt-1 mx-1 md:mx-2 z-10 bg-white dark:bg-gray-800 p-1 md:p-2 rounded-full shadow-md"
//       >
//         <HiChevronLeft className="text-lg md:text-2xl text-gray-700 dark:text-gray-200" />
//       </button>

//       {/* Tag Scroll Area */}
//       <div
//         ref={scrollRef}
//         className="overflow-x-auto overflow-y-hidden touch-pan-x"
//         style={{
//           scrollbarWidth: "none", // Firefox
//           msOverflowStyle: "none", // IE/Edge
//         }}
//       >
//         <style jsx>{`
//           div::-webkit-scrollbar {
//             display: none; /* Chrome, Safari */
//           }
//         `}</style>

//         <div className="flex gap-2 md:gap-3 snap-x px-6 md:px-8">
//           {tags.map((tag) => (
//             <a
//               key={tag}
//               href={`/tags/${encodeURIComponent(tag).toLowerCase()}`}
//               className="px-2 py-1 md:px-3 md:py-1.5 text-[11px] md:text-xs font-bold border rounded-md shrink-0 snap-start
//               bg-white text-black border-gray-300 hover:bg-gray-100
//               dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700 transition-colors"
//             >
//               {tag}
//             </a>
//           ))}
//         </div>
//       </div>

//       {/* Right Arrow */}
//       <button
//         onClick={() => scroll("right")}
//         className="absolute right-0 top-1/2 -translate-y-1/2 mt-1 mx-1 md:mx-2 z-10 bg-white dark:bg-gray-800 p-1 md:p-2 rounded-full shadow-md"
//       >
//         <HiChevronRight className="text-lg md:text-2xl text-gray-700 dark:text-gray-200" />
//       </button>
//     </div>
//   );
// }
