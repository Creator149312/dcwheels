"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Image as ImageIcon, LayoutGrid, List as ListIcon, ChevronUp, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import { sortListItems } from "@lib/listSorting";
import { getWheelUrl } from "@utils/UrlHandler";

// Dynamically import GridItems — keeps grid chunk separate and loaded on demand
const GridItems = dynamic(() => import("./GridItems"), { ssr: false });

export default function ListItems({
  list,
  sortBy,
  onSortChange,
  onReorder,
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
  // Default view mode: "grid" for entity/media lists or lists with posters, "list" for small text lists
  const [viewMode, setViewMode] = useState("grid");

  const handleMove = (index, direction) => {
    if (!onReorder || !list.items) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortedItems.length) return;

    // Work on the currently displayed sortedItems array
    const newItems = [...sortedItems];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    // Reset sort selector to custom when user explicitly shifts items
    if (onSortChange && sortBy !== "custom") {
      onSortChange("custom");
    }

    // Maintain rank index metadata
    const reordered = newItems.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    onReorder(reordered);
  };

  if (list.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Plus size={24} className="text-muted-foreground" />
        </div>
        <p className="font-bold text-foreground">No items yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          {isOwner ? 'Click "Add Item" above to get started.' : "This list is empty."}
        </p>
      </div>
    );
  }

  const sortedItems = sortListItems(list.items, sortBy);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
            {list.items.length} item{list.items.length !== 1 ? "s" : ""}
          </span>

          {/* Inline compact Sort selector */}
          {onSortChange && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-border/60">
              <select
                value={sortBy || "custom"}
                onChange={(e) => onSortChange(e.target.value)}
                className="text-xs font-medium bg-transparent text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none transition-colors"
                title="Sort items"
              >
                <option value="custom">Custom / Ranked</option>
                <option value="recently-saved">Recently Saved</option>
                <option value="alphabetical">Alphabetical (A→Z)</option>
                <option value="status">Status (Want → Done)</option>
                <option value="entity-type">By Type</option>
              </select>
            </div>
          )}
        </div>

        {/* Layout Switcher Toggle */}
        <div className="flex items-center p-0.5 rounded-lg border border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === "grid"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Grid card layout"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline text-[11px] font-semibold">Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all ${
              viewMode === "list"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title="Compact row layout"
          >
            <ListIcon size={14} />
            <span className="hidden sm:inline text-[11px] font-semibold">Compact</span>
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <GridItems
          items={sortedItems}
          isOwner={isOwner}
          editingItemId={editingItemId}
          editingItemValue={editingItemValue}
          editingImgPreview={editingImgPreview}
          editingSaving={editingSaving}
          editInputRef={editInputRef}
          editingImgFileRef={editingImgFileRef}
          startEdit={startEdit}
          saveItemEdit={saveItemEdit}
          cancelEdit={cancelEdit}
          deleteItem={deleteItem}
          handleEditImageSelect={handleEditImageSelect}
          setEditingItemValue={setEditingItemValue}
        />
      ) : (
        <div className="space-y-2 pb-10">
          {sortedItems.map((item, index) => {
            const isEntity = item.type === "entity";
            const isWord = item.type === "word";
            const safeId = item._id || `missing-id-${index}`;
            const isEditing = editingItemId === safeId;

            const thumbnail = isEntity
              ? item.image
              : isWord && (item.wordData?.startsWith("data:image") || item.wordData?.startsWith("http"))
              ? item.wordData
              : null;

            const initialLetter = ((isWord ? item.word : item.name) || "?").charAt(0).toUpperCase();

            // ── Editing mode: expand into a mini-form card ─────────────
            if (isEditing) {
              return (
                <div
                  key={safeId}
                  className="border border-primary/40 ring-2 ring-primary/20 bg-muted/40 rounded-xl p-3 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
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
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/imgpick:opacity-100 transition-opacity">
                        <ImageIcon size={14} className="text-white" />
                      </span>
                    </button>
                    <input type="file" accept="image/*" className="hidden" ref={editingImgFileRef} onChange={handleEditImageSelect} />

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

                  <p className="text-xs text-muted-foreground pl-0.5">
                    {editingImgPreview ? "Tap the thumbnail to replace the image." : "Tap the thumbnail to add a cover image."}
                  </p>

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
                className="group flex items-center justify-between bg-card hover:bg-muted/40 border border-border/60 shadow-sm rounded-xl p-2.5 sm:p-3 transition-all"
              >
                {/* Rank Number Badge & Reorder Arrows (Owner only) */}
                <div className="flex items-center gap-1 shrink-0">
                  {isOwner && !isSystemList && (
                    <div className="flex flex-col -space-y-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "up")}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                        title="Move Up (#)"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, "down")}
                        disabled={index === sortedItems.length - 1}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all cursor-pointer disabled:cursor-not-allowed"
                        title="Move Down (#)"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                  )}
                  <div className="w-6 sm:w-7 text-xs sm:text-sm font-black text-muted-foreground text-center">
                    #{index + 1}
                  </div>
                </div>

                {/* Thumbnail */}
                <div className="w-12 h-16 sm:w-14 sm:h-20 bg-muted flex items-center justify-center rounded-lg mr-3 overflow-hidden shrink-0 border border-border/40 shadow-xs relative">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnail}
                      alt={isWord ? item.word : item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          e.currentTarget.remove();
                          const fallbackSpan = document.createElement("span");
                          fallbackSpan.className =
                            "text-muted-foreground text-base sm:text-lg font-black uppercase select-none";
                          fallbackSpan.innerText = initialLetter;
                          parent.appendChild(fallbackSpan);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-muted-foreground text-base sm:text-lg font-black uppercase select-none">
                      {initialLetter}
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
                        className="font-bold text-base sm:text-lg hover:underline text-foreground truncate block"
                      >
                        {item.name}
                      </a>
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {item.entityType}
                      </span>
                    </>
                  ) : (
                    <p className="font-bold text-base sm:text-lg text-foreground truncate">
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
      )}
    </>
  );
}

