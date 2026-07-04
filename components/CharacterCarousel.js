"use client";

import Link from "next/link";
import Image from "next/image";

/**
 * CharacterCarousel — horizontal scroll for cast/characters.
 * Works for Anime (AniList) and Movies (TMDb).
 */
export default function CharacterCarousel({ characters = [] }) {
  if (!characters || characters.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-1.5 h-6 bg-primary rounded-full" />
          Characters & Cast
        </h2>
        <span className="text-xs text-muted-foreground font-medium">
          {characters.length} total
        </span>
      </div>

      <div className="relative group">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x transition-all scroll-smooth">
          {characters.map((char, index) => {
            const charId = char.id || char.externalId;
            const charName = char.name?.full || char.name || "Unknown";
            const charImage = char.image?.large || char.image || char.profile_path;
            const role = char.role || char.character || "";

            return (
              <Link
                key={`${charId}-${index}`}
                href={`/character/${charId}`}
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
                    <p className="text-[10px] text-muted-foreground line-clamp-1 uppercase tracking-tight font-medium mt-0.5">
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
        
        {/* Simple visual indicator for touch users */}
        <div className="absolute right-0 top-0 bottom-6 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none opacity-60 sm:hidden" />
      </div>
    </div>
  );
}
