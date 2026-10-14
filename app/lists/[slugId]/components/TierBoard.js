"use client";

import { useState } from "react";
import { Zap, MoreVertical } from "lucide-react";

const DEFAULT_TIERS = [
  { key: "S", label: "S", color: "#EF4444" },
  { key: "A", label: "A", color: "#F97316" },
  { key: "B", label: "B", color: "#EAB308" },
  { key: "C", label: "C", color: "#10B981" },
  { key: "D", label: "D", color: "#3B82F6" },
];

export default function TierBoard({
  list,
  isOwner,
  onReorder,
  onSpinTier,
  deleteItem,
}) {
  const tiers = list.tierConfig?.length ? list.tierConfig : DEFAULT_TIERS;
  const items = list.items || [];

  const [draggedItemId, setDraggedItemId] = useState(null);
  const [activeItemMenuId, setActiveItemMenuId] = useState(null);
  // Mobile / Touch ergonomic Tap-to-Place state
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [brokenImages, setBrokenImages] = useState(() => new Set());

  // Group items by tier
  const tieredItems = {};
  tiers.forEach((t) => {
    tieredItems[t.key] = [];
  });
  const unrankedItems = [];

  items.forEach((item) => {
    if (item.tier && tieredItems[item.tier]) {
      tieredItems[item.tier].push(item);
    } else {
      unrankedItems.push(item);
    }
  });

  const handleDragStart = (e, itemId) => {
    if (!isOwner) return;
    setDraggedItemId(itemId);
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    if (!isOwner) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetTierKey) => {
    if (!isOwner) return;
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain") || draggedItemId;
    if (!itemId) return;

    moveItemToTier(itemId, targetTierKey);
    setDraggedItemId(null);
  };

  const moveItemToTier = (itemId, targetTierKey) => {
    const updated = items.map((it) => {
      if (String(it._id) === String(itemId)) {
        return {
          ...it,
          tier: targetTierKey || null,
        };
      }
      return it;
    });

    onReorder?.(updated);
    setActiveItemMenuId(null);
    setSelectedItemId(null);
  };

  const handleImageError = (itemId) => {
    setBrokenImages((prev) => {
      const next = new Set(prev);
      next.add(String(itemId));
      return next;
    });
  };

  const renderItemCard = (item) => {
    const itemIdStr = String(item._id);
    const isEntity = item.type === "entity";
    const isWord = item.type === "word";
    const title = isWord ? item.word : item.name;
    const rawThumbnail = isEntity
      ? item.image
      : isWord && (item.wordData?.startsWith("data:image") || item.wordData?.startsWith("http"))
      ? item.wordData
      : null;
    const isImageBroken = brokenImages.has(itemIdStr);
    const thumbnail = !isImageBroken ? rawThumbnail : null;
    const initialLetter = (title || "?").charAt(0).toUpperCase();

    const isMenuOpen = activeItemMenuId === itemIdStr;
    const isSelected = selectedItemId === itemIdStr;

    return (
      <div
        key={itemIdStr}
        draggable={isOwner}
        onDragStart={(e) => handleDragStart(e, itemIdStr)}
        onClick={() => {
          if (!isOwner) return;
          // Toggle selection for Tap-to-Place on mobile & desktop
          setSelectedItemId((prev) => (prev === itemIdStr ? null : itemIdStr));
          setActiveItemMenuId(null);
        }}
        className={`relative group/card flex-shrink-0 w-20 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden bg-card border shadow-xs transition-all select-none touch-manipulation ${
          isSelected
            ? "ring-2 ring-primary border-primary scale-105 z-20 shadow-md"
            : "border-border/80 hover:border-primary/50"
        } ${isOwner ? "cursor-pointer sm:cursor-grab active:cursor-grabbing" : ""}`}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={title}
            onError={() => handleImageError(itemIdStr)}
            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300 pointer-events-none"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted via-muted/60 to-muted/30 p-2 font-black text-xl text-muted-foreground uppercase text-center">
            <span>{initialLetter}</span>
            <span className="text-[9px] font-semibold tracking-wider text-muted-foreground/60 line-clamp-1 mt-1">
              {title}
            </span>
          </div>
        )}

        {/* Selected badge cue */}
        {isSelected && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-sm bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-wider z-20 shadow-xs animate-in fade-in zoom-in-90 duration-150">
            Selected
          </div>
        )}

        {/* Caption Gradient */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-1.5 pt-4 pointer-events-none">
          <p className="text-white text-[10px] sm:text-xs font-bold leading-tight line-clamp-2 text-center">
            {title}
          </p>
        </div>

        {/* Owner Move Button (Tap to pick tier) */}
        {isOwner && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveItemMenuId(isMenuOpen ? null : itemIdStr);
            }}
            className="absolute top-1 right-1 w-6 h-6 rounded-md bg-black/70 hover:bg-black text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
            title="Move to tier"
          >
            <MoreVertical size={12} />
          </button>
        )}

        {/* Tier Picker Popover Menu */}
        {isMenuOpen && isOwner && (
          <div
            className="absolute inset-0 bg-background/95 backdrop-blur-sm z-30 p-1 flex flex-col justify-center gap-1 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground text-center mb-0.5">
              Set Tier:
            </p>
            <div className="grid grid-cols-2 gap-1">
              {tiers.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveItemToTier(item._id, t.key);
                  }}
                  className="px-1 py-1 rounded text-[10px] font-black text-white text-center shadow-xs hover:opacity-90 active:scale-95 transition-all"
                  style={{ backgroundColor: t.color }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                moveItemToTier(item._id, null);
              }}
              className="mt-1 px-1 py-0.5 rounded text-[9px] font-bold text-muted-foreground hover:bg-muted text-center"
            >
              Unranked
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Tier Board Matrix */}
      <div className="rounded-2xl border border-border/80 overflow-hidden shadow-sm bg-card/60">
        {tiers.map((tier, idx) => {
          const rowItems = tieredItems[tier.key] || [];

          return (
            <div
              key={tier.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, tier.key)}
              className={`flex flex-col sm:flex-row min-h-[96px] sm:min-h-[110px] border-b border-border/60 last:border-b-0 ${
                draggedItemId ? "hover:bg-primary/[0.03]" : ""
              }`}
            >
              {/* Left Header Tag */}
              <div
                className="w-full sm:w-28 md:w-32 flex-shrink-0 flex sm:flex-col items-center justify-between sm:justify-center p-3 text-white font-black text-xl sm:text-2xl select-none shadow-inner"
                style={{ backgroundColor: tier.color }}
              >
                <span className="drop-shadow-sm">{tier.label}</span>

                {/* Spin this Tier Action Button */}
                {rowItems.length > 0 && onSpinTier && (
                  <button
                    type="button"
                    onClick={() => onSpinTier(rowItems, `${list.name} (${tier.label} Tier)`)}
                    className="mt-0 sm:mt-1.5 px-2 py-0.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-[10px] sm:text-xs font-bold tracking-tight inline-flex items-center gap-1 transition-all shadow-xs"
                    title={`Spin only ${tier.label} items`}
                  >
                    <Zap size={10} className="fill-current" /> Spin
                  </button>
                )}
              </div>

              {/* Items Container for this Tier */}
              <div
                onClick={() => {
                  if (selectedItemId && isOwner) {
                    moveItemToTier(selectedItemId, tier.key);
                  }
                }}
                className={`flex-1 p-2 sm:p-3 flex flex-wrap gap-2 sm:gap-3 items-center min-h-[90px] transition-colors ${
                  selectedItemId
                    ? "bg-primary/[0.04] cursor-pointer ring-1 ring-inset ring-primary/20 hover:bg-primary/[0.08]"
                    : "bg-muted/10"
                }`}
              >
                {rowItems.length > 0 ? (
                  rowItems.map((item) => renderItemCard(item))
                ) : (
                  <div className="w-full py-4 text-center text-xs text-muted-foreground/40 italic select-none">
                    {selectedItemId
                      ? `👉 Tap here to place selected item in ${tier.label}`
                      : isOwner
                      ? "Drag items here or tap an item to place in this tier"
                      : "No items in this tier yet"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unranked / Pool Tray */}
      <div
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, null)}
        onClick={() => {
          if (selectedItemId && isOwner) {
            moveItemToTier(selectedItemId, null);
          }
        }}
        className={`rounded-2xl border border-dashed p-4 transition-colors ${
          selectedItemId
            ? "border-primary/40 bg-primary/[0.02] cursor-pointer hover:bg-primary/[0.05]"
            : "border-border bg-muted/20"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 bg-muted-foreground/50 rounded-full" />
            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Unranked Items Pool ({unrankedItems.length})
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground/60">
            {selectedItemId
              ? "Tap here to move selected item to Unranked"
              : isOwner
              ? "Drag or tap an item, then tap any tier to place"
              : ""}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 sm:gap-3 items-center min-h-[80px]">
          {unrankedItems.length > 0 ? (
            unrankedItems.map((item) => renderItemCard(item))
          ) : (
            <p className="text-xs text-muted-foreground/50 italic py-2">
              All items have been tiered!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
