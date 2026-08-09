"use client";

import { Pencil, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { sortListItems } from "@lib/listSorting";
import { getWheelUrl } from "@utils/UrlHandler";

export default function ListItems({
  list,
  sortBy,
  isOwner,
  isSystemList,
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
  if (list.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Plus size={24} className="text-muted-foreground" />
        </div>
        <p className="font-bold text-foreground">No items yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          {isOwner ? "Click \"Add Item\" above to get started." : "This list is empty."}
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        {list.items.length} item{list.items.length !== 1 ? "s" : ""}
      </p>
      <div className="space-y-2 pb-10">
        {sortListItems(list.items, sortBy).map((item, index) => {
          const isEntity = item.type === "entity";
          const isWord = item.type === "word";
          const safeId = item._id || `missing-id-${index}`;
          const isEditing = editingItemId === safeId;

          const thumbnail = isEntity
            ? item.image
            : isWord && (item.wordData?.startsWith("data:image") || item.wordData?.startsWith("http"))
            ? item.wordData
            : null;

          // ── Editing mode: expand into a mini-form card ─────────────
          if (isEditing) {
            return (
              <div
                key={safeId}
                className="border border-primary/40 ring-2 ring-primary/20 bg-muted/40 rounded-xl p-3 space-y-2.5 shadow-sm"
              >
                {/* Row: image picker + name input */}
                <div className="flex items-start gap-3">
                  {/* Clickable thumbnail / image picker */}
                  <button
                    type="button"
                    onClick={() => editingImgFileRef.current?.click()}
                    className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-dashed border-primary/40 hover:border-primary shrink-0 group/imgpick transition-colors"
                    title="Change image"
                  >
                    {editingImgPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editingImgPreview} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center bg-muted text-xl font-black uppercase text-muted-foreground select-none">
                        {editingItemValue.charAt(0) || "?"}
                      </span>
                    )}
                    {/* Hover overlay */}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/imgpick:opacity-100 transition-opacity">
                      <ImageIcon size={14} className="text-white" />
                    </span>
                  </button>
                  <input type="file" accept="image/*" className="hidden" ref={editingImgFileRef} onChange={handleEditImageSelect} />

                  {/* Name input */}
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
                    className="flex-1 bg-background border border-primary/50 rounded-lg px-2 py-1.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:font-normal placeholder:text-muted-foreground"
                  />
                </div>

                {/* Image hint */}
                <p className="text-[11px] text-muted-foreground pl-0.5">
                  {editingImgPreview ? "Tap the thumbnail to replace the image." : "Tap the thumbnail to add a cover image."}
                </p>

                {/* Save / Cancel buttons */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelEdit}
                    disabled={editingSaving}
                    className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveItemEdit(safeId)}
                    disabled={editingSaving || !editingItemValue.trim()}
                    className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-sm font-bold transition-colors"
                  >
                    {editingSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            );
          }

          // ── Normal (view) mode ──────────────────────────────────────
          return (
            <div
              key={safeId}
              className="group flex items-center justify-between bg-card hover:bg-muted/30 border border-border shadow-sm rounded-2xl p-2 md:p-2.5 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 md:w-16 md:h-16 bg-muted flex items-center justify-center rounded-xl mr-3 overflow-hidden shrink-0">
                {thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbnail} alt={isWord ? item.word : item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-muted-foreground text-xl md:text-2xl font-black uppercase select-none">
                    {(isWord ? item.word : item.name)?.charAt(0) ?? "?"}
                  </span>
                )}
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1 pr-2">
                {isEntity ? (
                  <>
                    <a
                      href={
                        (item.entityType === "wheel" || item.entityType === "uwheel") ? getWheelUrl({ _id: item.entityId, slug: item.slug }) :
                        `/${item.entityType}/${item.slug}`
                      }
                      className="font-bold text-sm md:text-base hover:underline text-foreground truncate block"
                    >
                      {item.name}
                    </a>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {item.entityType}
                    </span>
                  </>
                ) : (
                  <p className="font-bold text-sm md:text-base text-foreground truncate">
                    {item.word}
                  </p>
                )}
              </div>

              {/* Action buttons (owner only) */}
              {isOwner && (
                <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  {isWord && (
                    <button
                      onClick={() => startEdit(item)}
                      className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteItem(item._id)}
                    className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 text-muted-foreground transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
