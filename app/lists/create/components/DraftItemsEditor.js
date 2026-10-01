"use client";

import { useState } from "react";
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Trophy,
  Layers,
  Sparkles,
  Film,
  Gamepad2,
  User,
  Zap,
} from "lucide-react";

const TYPE_CONFIG = {
  anime: { label: "Anime", icon: Sparkles, color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  movie: { label: "Movie", icon: Film, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  tv: { label: "TV", icon: Film, color: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
  game: { label: "Game", icon: Gamepad2, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  character: { label: "Character", icon: User, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  wheel: { label: "Wheel", icon: Zap, color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
};

export default function DraftItemsEditor({
  items,
  format,
  tierConfig,
  onUpdateItems,
  onRemoveItem,
}) {
  const [draggedId, setDraggedId] = useState(null);

  const handleMove = (index, direction) => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const copy = [...items];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);

    // Maintain 1-based order rank for reordering
    const updated = copy.map((it, idx) => ({
      ...it,
      rank: idx + 1,
    }));

    onUpdateItems(updated);
  };

  const handleTierChange = (itemId, newTier) => {
    const updated = items.map((it) => {
      if (it.draftId === itemId) {
        return { ...it, tier: newTier || null };
      }
      return it;
    });
    onUpdateItems(updated);
  };

  // Drag and drop for tier assignments
  const handleDragStart = (e, draftId) => {
    setDraggedId(draftId);
    e.dataTransfer.setData("text/plain", draftId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropToTier = (e, tierKey) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;
    handleTierChange(id, tierKey);
    setDraggedId(null);
  };

  if (items.length === 0) {
    return (
      <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
          <Layers size={22} />
        </div>
        <h4 className="text-sm font-bold text-foreground">No items in your list yet</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm">
          Use the search bar above to look up movies, anime, games, or paste text in bulk to start assembling your list.
        </p>
      </div>
    );
  }

  // ── Tier Board View in Draft Builder ──
  if (format === "tiered") {
    const tiers = tierConfig || [
      { key: "S", label: "S", color: "#EF4444" },
      { key: "A", label: "A", color: "#F97316" },
      { key: "B", label: "B", color: "#EAB308" },
      { key: "C", label: "C", color: "#10B981" },
      { key: "D", label: "D", color: "#3B82F6" },
    ];

    const unranked = items.filter((it) => !it.tier);

    return (
      <div className="space-y-4">
        {/* Tier rows */}
        <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-card shadow-xs">
          {tiers.map((t) => {
            const tierItems = items.filter((it) => it.tier === t.key);

            return (
              <div
                key={t.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropToTier(e, t.key)}
                className="flex items-stretch min-h-[72px] transition-colors"
              >
                {/* Tier Label Column */}
                <div
                  style={{ backgroundColor: t.color }}
                  className="w-16 sm:w-20 shrink-0 flex items-center justify-center font-black text-white text-base sm:text-lg select-none px-2 text-center"
                >
                  {t.label}
                </div>

                {/* Drop Zone / Items in this Tier */}
                <div className="flex-1 p-2 flex flex-wrap items-center gap-2 bg-muted/10 min-h-[72px]">
                  {tierItems.map((item) => (
                    <div
                      key={item.draftId}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.draftId)}
                      className="group relative flex items-center gap-2 bg-background border border-border/80 hover:border-violet-500/50 rounded-xl p-1.5 pr-2 shadow-2xs cursor-grab active:cursor-grabbing transition-all select-none"
                    >
                      {item.image || item.wordData ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.image || item.wordData}
                          alt={item.name || item.word}
                          className="w-8 h-10 object-cover rounded-lg shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="w-8 h-10 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground uppercase shrink-0">
                          {(item.name || item.word || "?").charAt(0)}
                        </div>
                      )}

                      <div className="min-w-0 max-w-[120px] sm:max-w-[160px]">
                        <p className="text-xs font-bold text-foreground truncate">
                          {item.name || item.word}
                        </p>
                        {item.type === "entity" && (
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {item.entityType}
                          </span>
                        )}
                      </div>

                      {/* Dropdown to change tier or remove */}
                      <select
                        value={item.tier || ""}
                        onChange={(e) => handleTierChange(item.draftId, e.target.value)}
                        className="text-[10px] font-bold bg-muted/60 border border-border rounded px-1 py-0.5 cursor-pointer ml-1"
                        aria-label="Change Tier"
                      >
                        {tiers.map((ot) => (
                          <option key={ot.key} value={ot.key}>
                            {ot.label}
                          </option>
                        ))}
                        <option value="">Unranked</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.draftId)}
                        className="text-muted-foreground hover:text-red-500 p-0.5 transition-colors"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}

                  {tierItems.length === 0 && (
                    <span className="text-xs text-muted-foreground/50 italic px-2">
                      Drop items here
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Pool of unranked items waiting to be assigned */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy size={14} className="text-violet-500" />
              <span>Unranked Pool ({unranked.length})</span>
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-h-[50px]">
            {unranked.map((item) => (
              <div
                key={item.draftId}
                draggable
                onDragStart={(e) => handleDragStart(e, item.draftId)}
                className="group flex items-center gap-2 bg-muted/30 hover:bg-muted/60 border border-border rounded-xl p-1.5 pr-2.5 cursor-grab active:cursor-grabbing transition-all select-none"
              >
                {item.image || item.wordData ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={item.image || item.wordData}
                    alt={item.name || item.word}
                    className="w-7 h-9 object-cover rounded-md shrink-0 bg-muted"
                  />
                ) : (
                  <div className="w-7 h-9 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase shrink-0">
                    {(item.name || item.word || "?").charAt(0)}
                  </div>
                )}

                <div className="min-w-0 max-w-[130px] sm:max-w-[180px]">
                  <p className="text-xs font-bold text-foreground truncate">
                    {item.name || item.word}
                  </p>
                </div>

                <select
                  value=""
                  onChange={(e) => handleTierChange(item.draftId, e.target.value)}
                  className="text-[10px] font-bold bg-background border border-border rounded px-1.5 py-0.5 cursor-pointer ml-1"
                  aria-label="Assign Tier"
                >
                  <option value="" disabled>
                    Set Tier...
                  </option>
                  {tiers.map((ot) => (
                    <option key={ot.key} value={ot.key}>
                      Tier {ot.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => onRemoveItem(item.draftId)}
                  className="text-muted-foreground hover:text-red-500 p-0.5 transition-colors"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}

            {unranked.length === 0 && (
              <span className="text-xs text-muted-foreground/60 italic py-2">
                All {items.length} items have been assigned to tiers! 🎉
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Standard & Ranked List Items (Cards with Reordering) ──
  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const isEntity = item.type === "entity";
        const title = item.name || item.word;
        const thumbnail = item.image || item.wordData;
        const cfg = isEntity ? (TYPE_CONFIG[item.entityType] || { label: item.entityType, icon: Layers }) : null;
        const Icon = cfg?.icon;

        return (
          <div
            key={item.draftId}
            className="group flex items-center justify-between gap-3 bg-card hover:bg-muted/30 border border-border/80 rounded-2xl p-2.5 sm:p-3 transition-all shadow-2xs hover:shadow-xs"
          >
            {/* Rank / Reorder Controls */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0}
                  className="p-1 rounded-md hover:bg-muted disabled:opacity-20 transition text-muted-foreground hover:text-foreground"
                  title="Move up"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, "down")}
                  disabled={index === items.length - 1}
                  className="p-1 rounded-md hover:bg-muted disabled:opacity-20 transition text-muted-foreground hover:text-foreground"
                  title="Move down"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm select-none shrink-0 ${
                  index === 0
                    ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs"
                    : index === 1
                    ? "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-xs"
                    : index === 2
                    ? "bg-gradient-to-br from-amber-700 to-amber-900 text-white shadow-xs"
                    : "bg-muted text-foreground/80 border border-border/80"
                }`}
              >
                {index + 1}
              </div>
            </div>

            {/* Thumbnail + Title */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={thumbnail}
                  alt={title}
                  className="w-10 h-12 object-cover rounded-xl border border-border shrink-0 bg-muted"
                />
              ) : (
                <div className="w-10 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground uppercase shrink-0">
                  {(title || "?").charAt(0)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <span className="font-bold text-sm text-foreground block truncate">
                  {title}
                </span>
                {isEntity && cfg && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground mt-0.5">
                    {Icon && <Icon size={10} />}
                    {cfg.label}
                  </span>
                )}
              </div>
            </div>

            {/* Delete button */}
            <div className="shrink-0 flex items-center gap-1">
              <button
                type="button"
                onClick={() => onRemoveItem(item.draftId)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Remove item"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}