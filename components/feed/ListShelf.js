"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getListUrl } from "@utils/UrlHandler";

function ListCarouselItem({ item }) {
  const isEntity = item.type === "entity";
  const title = isEntity ? item.name : item.word;
  const image = isEntity ? item.image : null;
  const href = isEntity ? `/${item.entityType}/${item.slug}` : null;

  const CardContent = (
    <div className="flex-shrink-0 w-28 sm:w-32 bg-background hover:bg-accent/40 border border-border/40 rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.03] group flex flex-col shadow-sm">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden flex-shrink-0">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
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
}

export default function ListShelf({ list }) {
  // Universal rule: A list must have at least 5 items AND be of type 'entity' for the "Discovery Shelf" experience
  // Word lists lack the visual appeal (posters/icons) required for a high-quality feed.
  const hasMinItems = list.items && list.items.length >= 5;
  const isEntityList = list.items && list.items.some(item => item.type === "entity");

  if (!hasMinItems || !isEntityList) return null;

  return (
    <div className="mb-4 sm:mb-8 bg-muted/20 border-y sm:border border-border/40 sm:rounded-2xl py-4 sm:p-5">
      <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          <div className="w-1 h-3.5 rounded-full bg-primary" />
          <div className="flex flex-col">
            <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-muted-foreground/60">
              {list.authorName}&apos;s List
            </h3>
            <Link 
              href={getListUrl(list)}
              className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              {list.title}
            </Link>
          </div>
        </div>
        
        <Link 
          href={getListUrl(list)}
          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 bg-primary/10 px-2 py-1 rounded-full uppercase tracking-tight"
        >
          View Full List <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 px-4 sm:px-0 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {list.items.map((item, idx) => (
          <ListCarouselItem key={item._id || idx} item={item} />
        ))}
        
        {/* End of list CTA */}
        <Link 
          href={getListUrl(list)}
          className="flex-shrink-0 w-28 sm:w-32 border border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center p-4 text-center hover:bg-accent/20 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
             <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase">See all items</p>
        </Link>
      </div>
    </div>
  );
}
