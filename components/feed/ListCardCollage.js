"use client";

import { memo } from "react";
import Link from "next/link";
import { getListUrl } from "@utils/UrlHandler";
import { timeAgo } from "@utils/HelperFunctions";

function getItemImage(item) {
  if (!item) return null;
  if (item.image) return item.image;
  if (item.wordData && item.wordData.startsWith("http")) return item.wordData;
  return null;
}

function getItemTitle(item) {
  if (!item) return "";
  if (item.type === "entity") return item.name || "";
  return item.word || "";
}

function Poster({ item, index, total }) {
  const image = getItemImage(item);
  const title = getItemTitle(item);
  const overlap = index > 0 ? `ml-[-${Math.min(index * 14, 42)}%]` : "";
  const zIndex = `z-[${total - index}]`;
  const rotate = index === 0 ? "-rotate-3" : index === 1 ? "rotate-2" : index === 2 ? "-rotate-2" : index === 3 ? "rotate-3" : "rotate-1";

  return (
    <div
      className={`relative aspect-[2/3] w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 border-background shadow-md ${overlap} ${zIndex} ${rotate}`}
      style={{ zIndex: total - index }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-500/30 to-pink-500/30 p-2">
          <span className="text-center text-[8px] font-bold uppercase leading-tight text-foreground/60 line-clamp-3">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}

function ListCardCollage({ list }) {
  const url = getListUrl(list);
  const authorName = list.authorName || "Someone";
  const previewItems = (list.items || []).slice(0, 5);

  return (
    <article className="border-b border-border/40 bg-card/60 dark:bg-muted/20 sm:shadow-2xs px-4 py-4 sm:px-5 sm:py-5 transition-all duration-200 hover:bg-card hover:shadow-xs dark:hover:bg-muted/30 sm:mb-0 sm:rounded-2xl sm:border sm:border-border/60">
      {/* Header: User */}
      <div className="mb-3 flex items-center gap-2">
        <Link href={`/u/${encodeURIComponent(authorName.toLowerCase())}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/10 bg-gradient-to-tr from-primary/10 to-primary/5 text-[11px] font-bold text-primary">
            {authorName.charAt(0).toUpperCase()}
          </div>
        </Link>
        <div className="min-w-0 leading-tight">
          <Link
            href={`/u/${encodeURIComponent(authorName.toLowerCase())}`}
            className="block truncate text-sm font-bold text-foreground hover:underline"
          >
            @{authorName}
          </Link>
          <span className="text-[10px] text-muted-foreground/60">{timeAgo(list.createdAt)}</span>
        </div>
      </div>

      {/* Collage overlap */}
      <Link href={url} className="group/card block mb-3">
        <div className="flex items-center pl-2">
          {previewItems.map((item, idx) => (
            <Poster key={item._id || idx} item={item} index={idx} total={previewItems.length} />
          ))}
        </div>
      </Link>

      {/* Title */}
      <div>
        <Link href={url}>
          <h3 className="text-base font-black leading-tight text-foreground hover:text-primary sm:text-lg line-clamp-2">
            {list.name || list.title || "Untitled List"}
          </h3>
        </Link>
      </div>
    </article>
  );
}

export default memo(ListCardCollage);
