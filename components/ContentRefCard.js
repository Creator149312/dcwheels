"use client";

import { Layers, ArrowRight } from "lucide-react";

const TYPE_LABELS = {
  wheel: "Wheel",
  anime: "Anime",
  movie: "Movie",
  game: "Game",
  character: "Character",
  list: "List",
};

/**
 * Unified lightweight contentRef card.
 * Layout: thumbnail | title + type pill | arrow.
 */
export default function ContentRefCard({ href, image, title, type }) {
  const label = TYPE_LABELS[type] || type || "Link";

  return (
    <a
      href={href}
      className="group flex gap-0 overflow-hidden rounded-2xl border border-border/70 bg-muted/10 hover:bg-muted/20 transition-colors min-h-[128px] touch-manipulation"
    >
      <div className="relative flex-shrink-0 w-28 self-stretch bg-muted overflow-hidden rounded-l-2xl">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title || label}
            width={112}
            height={128}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <Layers size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 p-4 flex flex-col justify-center gap-2 min-w-0">
        <h4 className="font-semibold text-foreground text-sm line-clamp-2">
          {title || "Untitled"}
        </h4>
        <span className="inline-flex items-center self-start text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary">
          {label}
        </span>
      </div>
      <div className="flex-shrink-0 self-center pr-4">
        <div className="h-8 w-8 flex items-center justify-center rounded-full border border-border group-hover:bg-primary group-hover:border-primary transition">
          <ArrowRight
            size={14}
            className="text-muted-foreground group-hover:text-primary-foreground group-hover:translate-x-0.5 transition"
          />
        </div>
      </div>
    </a>
  );
}
