"use client";

import { ChevronUp, ChevronDown, Trash2, Pencil, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getWheelUrl } from "@utils/UrlHandler";

export default function RankedList({
  items,
  isOwner,
  onReorder,
  deleteItem,
  startEdit,
}) {
  const handleMove = (index, direction) => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Update rank numbers
    const rankedItems = newItems.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    onReorder?.(rankedItems);
  };

  const getRankBadgeClass = (rank) => {
    if (rank === 1) return "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm ring-2 ring-amber-300/40";
    if (rank === 2) return "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-sm ring-2 ring-slate-300/40";
    if (rank === 3) return "bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-sm ring-2 ring-amber-600/40";
    return "bg-muted text-foreground/80 border border-border/80";
  };

  return (
    <div className="space-y-2.5 pb-10">
      {items.map((item, index) => {
        const rank = index + 1;
        const isEntity = item.type === "entity";
        const isWord = item.type === "word";
        const safeId = item._id || `rank-${index}`;

        const thumbnail = isEntity
          ? item.image
          : isWord && (item.wordData?.startsWith("data:image") || item.wordData?.startsWith("http"))
          ? item.wordData
          : null;

        const title = isWord ? item.word : item.name;
        const href = isEntity
          ? (item.entityType === "wheel" || item.entityType === "uwheel")
            ? getWheelUrl({ _id: item.entityId, slug: item.slug })
            : `/${item.entityType}/${item.slug}`
          : null;

        const initialLetter = (title || "?").charAt(0).toUpperCase();

        return (
          <div
            key={safeId}
            className="group flex items-center justify-between gap-3 bg-card hover:bg-muted/30 border border-border/70 rounded-2xl p-2.5 sm:p-3 transition-all shadow-2xs hover:shadow-xs"
          >
            {/* Rank Number + Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {isOwner && (
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => handleMove(index, "up")}
                    disabled={index === 0}
                    className="p-1 rounded-md hover:bg-muted disabled:opacity-20 transition text-muted-foreground hover:text-foreground"
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMove(index, "down")}
                    disabled={index === items.length - 1}
                    className="p-1 rounded-md hover:bg-muted disabled:opacity-20 transition text-muted-foreground hover:text-foreground"
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}

              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-sm sm:text-base shrink-0 select-none ${getRankBadgeClass(
                  rank
                )}`}
              >
                #{rank}
              </div>
            </div>

            {/* Poster Thumbnail */}
            <div className="w-12 h-16 sm:w-14 sm:h-20 bg-muted rounded-xl overflow-hidden shrink-0 border border-border/40 shadow-xs relative">
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 font-black text-lg text-muted-foreground">
                  {initialLetter}
                </div>
              )}
            </div>

            {/* Main Item Info */}
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 mb-0.5">
                {href ? (
                  <Link
                    href={href}
                    className="font-bold text-foreground text-sm sm:text-base hover:text-primary transition-colors truncate block"
                  >
                    {title}
                  </Link>
                ) : (
                  <span className="font-bold text-foreground text-sm sm:text-base truncate block">
                    {title}
                  </span>
                )}
                {href && (
                  <Link href={href} className="text-muted-foreground/40 hover:text-primary transition-colors shrink-0">
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {item.entityType || item.type}
                </span>
                {item.tier && (
                  <span className="text-[10px] sm:text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Tier {item.tier}
                  </span>
                )}
              </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
              <div className="flex items-center gap-1 shrink-0">
                {isWord && startEdit && (
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition"
                    title="Edit item"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                {deleteItem && (
                  <button
                    onClick={() => deleteItem(safeId)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 transition"
                    title="Delete item"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
