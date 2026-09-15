"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { slugify } from "@utils/HelperFunctions";

/**
 * CharacterCarousel — horizontal scroll for cast/characters with desktop arrow controls.
 */
export default function CharacterCarousel({ characters = [] }) {
  const scrollRef = useRef(null);
  const [arrows, setArrows] = useState({ left: false, right: true });

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
  }, [characters]);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!characters || characters.length === 0) return null;

  return (
    <div className="w-full relative group/cast">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary rounded-full" />
          Characters & Cast
        </h2>
        <span className="text-xs text-muted-foreground font-medium">
          {characters.length} total
        </span>
      </div>

      <div className="relative">
        {/* Left Arrow Button */}
        {arrows.left && (
          <button
            onClick={() => scroll("left")}
            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 border border-border shadow-md backdrop-blur-sm hidden md:flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            aria-label="Scroll Left"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x transition-all scroll-smooth"
          style={{ scrollbarWidth: "none" }}
        >
          {characters.map((char, index) => {
            const charId = char.id || char.externalId;
            const charName = char.name?.full || char.name || "Unknown";
            const charImage = char.image?.large || char.image || char.profile_path;
            const role = char.role || char.character || "";
            
            // Generate SEO friendly URL: /character/[id]-[slugified-name]
            const charSlug = slugify(charName);
            const characterUrl = `/character/${charId}-${charSlug}`;

            return (
              <Link
                key={`${charId}-${index}`}
                href={characterUrl}
                className="flex-shrink-0 w-24 sm:w-28 snap-start group/card"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted border border-border/50 group-hover/card:border-primary/50 transition-colors">
                  {charImage ? (
                    <Image
                      src={charImage.startsWith("http") ? charImage : `https://image.tmdb.org/t/p/w185${charImage}`}
                      alt={charName}
                      fill
                      className="object-cover group-hover/card:scale-110 transition-transform duration-500"
                      sizes="(max-width: 640px) 96px, 112px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/40 font-bold text-xl uppercase">
                      {charName.charAt(0)}
                    </div>
                  )}
                  {/* Subtle overlay for name on hover or small screens */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 sm:group-hover/card:opacity-100 transition-opacity" />
                </div>
                <div className="mt-2 text-center sm:text-left">
                  <p className="text-xs font-bold text-foreground line-clamp-1 group-hover/card:text-primary transition-colors">
                    {charName}
                  </p>
                  {role && (
                    <p className="text-xs text-muted-foreground line-clamp-1 uppercase tracking-wider font-medium mt-0.5">
                      {role}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
          
          {/* Filler to allow scrolling past last item */}
          <div className="flex-shrink-0 w-4" />
        </div>

        {/* Right Arrow Button */}
        {arrows.right && (
          <button
            onClick={() => scroll("right")}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-card/90 border border-border shadow-md backdrop-blur-sm hidden md:flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-200"
            aria-label="Scroll Right"
          >
            <ChevronRight size={16} />
          </button>
        )}
        
        {/* Simple visual indicator for touch users */}
        <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-60 sm:hidden" />
      </div>
    </div>
  );
}
