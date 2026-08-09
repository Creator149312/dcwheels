"use client";

import Link from "next/link";
import { Card } from "@components/ui/card";
import { ArrowRight, Layers } from "lucide-react";
import { getWheelUrl } from "@utils/UrlHandler";

/**
 * Lightweight wheel preview card used in posts (spin results, shares, etc.).
 * Mirrors the WheelCard search component but accepts data shaped for posts.
 */
export default function WheelPreviewCard({ title, segmentCount, image, slug, wheelId }) {
  const count = segmentCount || 0;

  return (
    <Link
      href={getWheelUrl({ _id: wheelId, slug })}
      className="group block touch-manipulation"
    >
      <Card className="group relative overflow-hidden border-none bg-card shadow-sm p-3 md:p-5 transition duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.99]">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:from-primary/5 transition-colors duration-500" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
            <div className="relative flex-shrink-0 h-10 w-10 md:h-12 md:w-12 flex items-center justify-center rounded-lg md:rounded-xl bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-12 transition duration-300 overflow-hidden">
              {image ? (
                <img
                  src={image}
                  alt={title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Layers size={18} className="md:w-5 md:h-5" />
              )}
            </div>
            <div className="truncate">
              <h2 className="text-sm md:text-base font-bold text-foreground truncate mb-0.5">
                {title || "Untitled Wheel"}
              </h2>
              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                {count} Segment{count !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="h-7 w-7 md:h-9 md:w-9 flex items-center justify-center rounded-full border border-border group-hover:bg-primary group-hover:border-primary transition">
              <ArrowRight
                size={14}
                className="text-muted-foreground md:w-4 md:h-4 group-hover:text-primary-foreground group-hover:translate-x-0.5 transition"
              />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
