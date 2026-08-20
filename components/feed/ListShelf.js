"use client";

import { memo } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getListUrl } from "@utils/UrlHandler";
import { timeAgo } from "@utils/HelperFunctions";

const ListCarouselItem = memo(function ListCarouselItem({ item }) {
  const isEntity = item.type === "entity";
  const title = isEntity ? item.name : item.word;
  const image = isEntity ? item.image : null;
  const href = isEntity ? `/${item.entityType}/${item.slug}` : null;

  const CardContent = (
    <div className="w-full h-full bg-background hover:bg-accent/40 border border-border/40 rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02] group flex flex-col shadow-sm">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden flex-shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground/60 px-2 text-center break-words">{title}</span>
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col justify-between flex-1 min-w-0">
        <p className="text-[10px] sm:text-[11px] font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors uppercase">
          {title}
        </p>
        <p className="text-[8px] sm:text-[9px] text-muted-foreground uppercase font-bold tracking-wider mt-1">
          {item.entityType || item.type}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        {CardContent}
      </Link>
    );
  }

  return CardContent;
});

function ListShelf({ list }) {
  // Universal rule: A list must have at least 5 items AND be of type 'entity' for the "Discovery Shelf" experience
  // Word lists lack the visual appeal (posters/icons) required for a high-quality feed.
  const hasMinItems = list.items && list.items.length >= 5;
  const isEntityList = list.items && list.items.some(item => item.type === "entity");

  if (!hasMinItems || !isEntityList) return null;

  const totalItems = list.itemCount ?? list.items?.length ?? 0;
  const authorName = list.authorName || "Someone";
  const previewItems = list.items.slice(0, 4);
  const mobilePreviewItems = list.items.slice(0, 3);

  return (
    <article className="mb-4 sm:mb-8 bg-muted/20 border-y sm:border border-border/40 sm:rounded-2xl py-4 sm:p-5 px-2 sm:px-4">
      {/* Header: avatar, username, time, View Full List */}
      <div className="flex items-center justify-between gap-2 mb-3 px-2 sm:px-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href={`/u/${encodeURIComponent(authorName.toLowerCase())}`}>
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-primary/10 bg-gradient-to-tr from-primary/10 to-primary/5 text-[11px] font-bold text-primary">
              {authorName.charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="flex items-center gap-1.5 min-w-0 leading-tight">
            <Link
              href={`/u/${encodeURIComponent(authorName.toLowerCase())}`}
              className="truncate text-sm font-bold text-foreground hover:underline"
            >
              {authorName}
            </Link>
            <span className="text-[10px] text-muted-foreground/40">•</span>
            <span className="whitespace-nowrap text-[10px] font-semibold text-muted-foreground/60">
              {timeAgo(list.createdAt)}
            </span>
          </div>
        </div>
        <Link
          href={getListUrl(list)}
          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 bg-primary/10 px-2 py-1 rounded-full uppercase tracking-tight flex-shrink-0"
        >
          View Full List <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Title + description */}
      <div className="mb-3 px-2 sm:px-0">
        <Link href={getListUrl(list)}>
          <h3 className="text-base font-black leading-tight text-foreground hover:text-primary sm:text-lg line-clamp-2">
            {list.name || list.title || "Untitled List"}
          </h3>
        </Link>
        {list.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {list.description}
          </p>
        )}
      </div>

      {/* Desktop: 4 items + CTA */}
      <div className="hidden sm:grid sm:grid-cols-5 sm:gap-2 pb-2" style={{ contain: "layout style paint" }}>
        {previewItems.map((item, idx) => (
          <ListCarouselItem key={item._id || idx} item={item} />
        ))}
        <Link
          href={getListUrl(list)}
          className="flex flex-col items-center justify-center p-4 text-center border border-dashed border-border/60 rounded-xl hover:bg-accent/20 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">See all {totalItems} items</p>
        </Link>
      </div>

      {/* Mobile: 3 items, no CTA */}
      <div className="grid grid-cols-3 gap-1 sm:hidden pb-2" style={{ contain: "layout style paint" }}>
        {mobilePreviewItems.map((item, idx) => (
          <ListCarouselItem key={item._id || idx} item={item} />
        ))}
      </div>
    </article>
  );
}

export default memo(ListShelf);
