"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const CATEGORY_TAGS = {
  movie: [
    { label: "All Movies", tag: "" },
    { label: "Action", tag: "action" },
    { label: "Sci-Fi", tag: "sci-fi" },
    { label: "Horror", tag: "horror" },
    { label: "Comedy", tag: "comedy" },
    { label: "Drama", tag: "drama" },
    { label: "Animation", tag: "animation" },
    { label: "Thriller", tag: "thriller" },
  ],
  anime: [
    { label: "All Anime", tag: "" },
    { label: "Shonen", tag: "shonen" },
    { label: "Isekai", tag: "isekai" },
    { label: "Action", tag: "action" },
    { label: "Romance", tag: "romance" },
    { label: "Fantasy", tag: "fantasy" },
    { label: "Slice of Life", tag: "slice-of-life" },
    { label: "Horror", tag: "horror" },
  ],
  game: [
    { label: "All Games", tag: "" },
    { label: "RPG", tag: "rpg" },
    { label: "Action", tag: "action" },
    { label: "Shooter", tag: "shooter" },
    { label: "Strategy", tag: "strategy" },
    { label: "Multiplayer", tag: "multiplayer" },
    { label: "Indie", tag: "indie" },
    { label: "Mobile", tag: "mobile" },
  ],
  character: [
    { label: "All Characters", tag: "" },
    { label: "Protagonists", tag: "protagonist" },
    { label: "Villains", tag: "villain" },
    { label: "Sidekicks", tag: "sidekick" },
    { label: "Waifu", tag: "waifu" },
    { label: "Husbando", tag: "husbando" },
  ],
};

export default function CategorySubgenrePills({ type }) {
  const searchParams = useSearchParams();
  const currentTag = searchParams.get("tag") || "";
  const pills = CATEGORY_TAGS[type] || [];

  if (pills.length <= 1) return null;

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide"
      style={{ scrollbarWidth: "none" }}
    >
      {pills.map((p) => {
        const isSelected = (!currentTag && !p.tag) || currentTag === p.tag;
        const params = new URLSearchParams(searchParams.toString());
        if (p.tag) {
          params.set("tag", p.tag);
        } else {
          params.delete("tag");
        }
        const href = params.toString() ? `/${type}?${params.toString()}` : `/${type}`;

        return (
          <Link
            key={p.tag || "all"}
            href={href}
            scroll={false}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              isSelected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/80 text-muted-foreground hover:bg-accent hover:text-foreground border border-border/50"
            }`}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}
