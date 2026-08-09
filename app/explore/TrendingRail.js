"use client";

import { useRef } from "react";
import Link from "next/link";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { getWheelUrl } from "@utils/UrlHandler";

export default function TrendingRail({ items }) {
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
        <h2 className="flex items-center gap-1.5 text-sm md:text-base font-black text-foreground uppercase tracking-wider">
          <Sparkles size={16} className="text-amber-500" />
          Trending now
        </h2>
        <div className="hidden md:flex items-center gap-1">
          <button
            onClick={() => scrollRail(-1)}
            className="p-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollRail(1)}
            className="p-1.5 rounded-full bg-muted hover:bg-accent text-muted-foreground"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((item, i) => (
          <Link
            key={item._id}
            href={getWheelUrl(item)}
            className="snap-start shrink-0 w-[150px] md:w-[180px] group"
          >
            <div className="relative aspect-square w-full bg-muted/40 rounded-2xl overflow-hidden border border-border group-hover:border-primary/50 transition-all">
              <div className="absolute top-2 left-2 z-10 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                {i + 1}
              </div>
              {item.wheelPreview ? (
                <img
                  src={item.wheelPreview}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-muted-foreground/40">
                  {item.title?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="mt-2 text-xs md:text-sm font-bold text-foreground line-clamp-2 leading-tight px-0.5">
              {item.title}
            </h3>
          </Link>
        ))}
      </div>
    </section>
  );
}
