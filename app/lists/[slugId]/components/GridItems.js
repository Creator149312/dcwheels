"use client";

import { Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { getWheelUrl } from "@utils/UrlHandler";

export default function GridItems({
  items,
  isOwner,
  editingItemId,
  editingItemValue,
  editingImgPreview,
  editingSaving,
  editInputRef,
  editingImgFileRef,
  startEdit,
  saveItemEdit,
  cancelEdit,
  deleteItem,
  handleEditImageSelect,
  setEditingItemValue,
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 pb-10">
      {items.map((item, index) => {
        const isEntity = item.type === "entity";
        const isWord = item.type === "word";
        const safeId = item._id || `missing-id-${index}`;
        const isEditing = editingItemId === safeId;

        const thumbnail = isEntity
          ? item.image
          : isWord && (item.wordData?.startsWith("data:image") || item.wordData?.startsWith("http"))
          ? item.wordData
          : null;

        const href = isEntity
          ? (item.entityType === "wheel" || item.entityType === "uwheel")
            ? getWheelUrl({ _id: item.entityId, slug: item.slug })
            : `/${item.entityType}/${item.slug}`
          : null;

        // ── Editing mode card ─────────────
        if (isEditing) {
          return (
            <div
              key={safeId}
              className="border border-primary/40 ring-2 ring-primary/20 bg-muted/40 rounded-xl p-3 flex flex-col justify-between shadow-sm col-span-2 sm:col-span-1"
            >
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => editingImgFileRef.current?.click()}
                  className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary group/imgpick transition-colors"
                  title="Change image"
                >
                  {editingImgPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editingImgPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center bg-muted text-2xl font-black uppercase text-muted-foreground select-none">
                      {editingItemValue.charAt(0) || "?"}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/imgpick:opacity-100 transition-opacity">
                    <ImageIcon size={18} className="text-white" />
                  </span>
                </button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={editingImgFileRef}
                  onChange={handleEditImageSelect}
                />

                <input
                  ref={editInputRef}
                  value={editingItemValue}
                  onChange={(e) => setEditingItemValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveItemEdit(safeId);
                    if (e.key === "Escape") cancelEdit();
                  }}
                  disabled={editingSaving}
                  placeholder="Item name"
                  className="w-full bg-background border border-primary/50 rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex justify-end gap-1.5 mt-2.5">
                <button
                  onClick={cancelEdit}
                  disabled={editingSaving}
                  className="px-2.5 py-1 rounded-md border border-border text-xs text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveItemEdit(safeId)}
                  disabled={editingSaving || !editingItemValue.trim()}
                  className="px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold disabled:opacity-40"
                >
                  {editingSaving ? "…" : "Save"}
                </button>
              </div>
            </div>
          );
        }

        // ── Grid Poster Card ──────────────────────────────────────
        return (
          <div
            key={safeId}
            className="group relative flex flex-col bg-card border border-border/40 hover:border-border/80 shadow-xs hover:shadow-md rounded-xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
          >
            {/* Poster Aspect Ratio 3:4 (standard movie/anime card ratio across app) */}
            {href ? (
              <a href={href} className="relative w-full aspect-[3/4] bg-muted overflow-hidden block">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt={isWord ? item.word : item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <span className="text-muted-foreground text-2xl font-black uppercase select-none">
                      {(isWord ? item.word : item.name)?.charAt(0) ?? "?"}
                    </span>
                  </div>
                )}

                {/* Media Type Badge */}
                {isEntity && item.entityType && (
                  <span className="absolute top-2 left-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs tracking-wider">
                    {item.entityType}
                  </span>
                )}
              </a>
            ) : (
              <div className="relative w-full aspect-[3/4] bg-muted overflow-hidden">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt={isWord ? item.word : item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <span className="text-muted-foreground text-2xl font-black uppercase select-none">
                      {(isWord ? item.word : item.name)?.charAt(0) ?? "?"}
                    </span>
                  </div>
                )}

                {/* Media Type Badge */}
                {isEntity && item.entityType && (
                  <span className="absolute top-2 left-2 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs tracking-wider">
                    {item.entityType}
                  </span>
                )}
              </div>
            )}

            {/* Owner hover actions */}
            {isOwner && (
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                {isWord && (
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded-md bg-black/70 hover:bg-black text-white backdrop-blur-xs transition-colors"
                    title="Edit"
                  >
                    <Pencil size={12} />
                  </button>
                )}
                <button
                  onClick={() => deleteItem(item._id)}
                  className="p-1.5 rounded-md bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-xs transition-colors"
                  title="Remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}

            {/* Title & info area */}
            <div className="p-2 sm:p-2.5 flex-1 flex flex-col justify-between min-w-0">
              {href ? (
                <a
                  href={href}
                  className="font-bold text-[11px] sm:text-xs text-foreground hover:text-primary line-clamp-2 transition-colors leading-tight"
                >
                  {item.name}
                </a>
              ) : (
                <p className="font-bold text-[11px] sm:text-xs text-foreground line-clamp-2 leading-tight">
                  {item.word}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

}
