"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * ExploreEntityRail — horizontal scroller for trending external entities
 * (games / anime / movies). Items must be pre-normalized to the shape:
 *
 *   { id, href, title, image, subtitle? }
 *
 * The rail is intentionally dumb: no fetching, no sorting, no entity-type
 * branching. All of that lives in the server page where caching applies.
 *
 * Visual contract differs from the wheels rail at the top of /explore:
 *   - 2:3 poster aspect (entities are visual-first; wheels are square)
 *   - No rank badges (these are "trending" not "leaderboard")
 *   - Slightly wider tiles for readability
 */
export default function ExploreEntityRail({
  title,
  emoji,
  items,
  viewAllHref,
  accentColor = "text-blue-500",
}) {
  const railRef = useRef(null);

  if (!items || items.length === 0) return null;

  const scrollRail = (dir) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className="mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-1.5 text-sm md:text-base font-black text-gray-900 dark:text-white uppercase tracking-wider">
          {emoji && <span className={accentColor}>{emoji}</span>}
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              View all →
            </Link>
          )}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => scrollRail(-1)}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollRail(1)}
              className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={railRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="snap-start shrink-0 w-[120px] md:w-[150px] group"
          >
            <div className="relative aspect-[2/3] w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 group-hover:border-blue-500 transition-all">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-200 dark:text-gray-700">
                  {item.title?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="mt-2 text-xs md:text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight px-0.5">
              {item.title}
            </h3>
            {item.subtitle && (
              <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 line-clamp-1 px-0.5 mt-0.5">
                {item.subtitle}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
