"use client";

import { useState } from "react";
import { ChevronRight, Disc3, Film, Gamepad2, Tv, User, Layers, Hash } from "lucide-react";

const TYPE_ICONS = {
  wheel: Disc3,
  anime: Tv,
  movie: Film,
  game: Gamepad2,
  character: User,
  list: Layers,
};

const TYPE_LABELS = {
  wheel: "Wheel",
  anime: "Anime",
  movie: "Movie",
  game: "Game",
  character: "Character",
  list: "List",
};

/**
 * Sleek, lightweight topic chip for contentRef.
 * Renders an optional 20x20px micro-avatar or category icon,
 * with Threads/Instagram-style inline entity hub link.
 */
export default function ContentRefCard({ href, title, type, image }) {
  const [imgError, setImgError] = useState(false);
  const label = TYPE_LABELS[type] || type || "Topic";
  const IconComponent = TYPE_ICONS[type] || Hash;

  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2 px-3 py-1 sm:py-1.5 rounded-full border border-border/80 bg-muted/30 hover:bg-primary/10 hover:border-primary/30 transition-all text-foreground max-w-full touch-manipulation shadow-2xs hover:shadow-xs"
    >
      {/* 20x20px Micro Thumbnail or Fallback Icon */}
      {image && !imgError ? (
        <div className="relative w-5 h-5 rounded-full overflow-hidden shrink-0 border border-border/60 bg-muted">
          <img
            src={image}
            alt={title || label}
            width={20}
            height={20}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary shrink-0 group-hover:scale-110 transition-transform">
          <IconComponent size={12} />
        </div>
      )}

      <span className="text-xs font-extrabold uppercase tracking-wider text-primary shrink-0">
        {label}
      </span>
      <span className="text-xs text-muted-foreground/40 shrink-0">•</span>
      <span className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
        {title || "Untitled"}
      </span>
      <ChevronRight size={14} className="text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0 ml-0.5" />
    </a>
  );
}
