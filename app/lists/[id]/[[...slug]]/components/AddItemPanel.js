"use client";

import { Plus, X, Image as ImageIcon } from "lucide-react";

export default function AddItemPanel({
  addPanelMode,
  isOwner,
  isSystemList,
  bulkLoading,
  imgWord,
  imgPreview,
  imgUploading,
  imgFileRef,
  setAddPanelMode,
  addItem,
  handleBulkSubmit,
  handleImageSelect,
  handleImageSubmit,
  setImgWord,
  setImgPreview,
}) {
  if (!isOwner || isSystemList) return null;

  return (
    <div className="mb-6">
      {addPanelMode === null ? (
        // ── Collapsed: single button ───────────────────────────────────
        <button
          onClick={() => setAddPanelMode("text")}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95"
        >
          <Plus size={16} /> Add Item
        </button>
      ) : (
        // ── Expanded panel ─────────────────────────────────────────────
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border">
            {["text", "bulk", "image"].map((mode) => (
              <button
                key={mode}
                onClick={() => setAddPanelMode(mode)}
                className={`px-4 py-2.5 text-xs font-bold capitalize transition-colors ${
                  addPanelMode === mode
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "text" ? "Quick Add" : mode === "bulk" ? "Bulk Import" : "Image"}
              </button>
            ))}
            <button
              onClick={() => setAddPanelMode(null)}
              className="ml-auto p-2.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Quick Add */}
          {addPanelMode === "text" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const txt = new FormData(e.target).get("quickAdd")?.trim();
                if (!txt) return;
                addItem({ type: "word", word: txt, wordData: "" });
                e.target.reset();
              }}
              className="flex gap-2 items-center p-3"
            >
              <input
                type="text"
                name="quickAdd"
                placeholder="Type an item and press Enter..."
                autoFocus
                autoComplete="off"
                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform shrink-0"
              >
                Add
              </button>
            </form>
          )}

          {/* Bulk Import */}
          {addPanelMode === "bulk" && (
            <form onSubmit={handleBulkSubmit} className="p-3 space-y-2">
              <textarea
                name="bulkText"
                rows={5}
                autoFocus
                placeholder={"One item per line:\nMario\nLuigi\nBowser"}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                disabled={bulkLoading}
              />
              <button
                type="submit"
                disabled={bulkLoading}
                className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform"
              >
                {bulkLoading ? "Importing..." : "Import All"}
              </button>
            </form>
          )}

          {/* Image Upload */}
          {addPanelMode === "image" && (
            <form onSubmit={handleImageSubmit} className="p-3 space-y-3">
              <input
                type="text"
                placeholder="Item name (e.g. Mario, Pizza...)"
                value={imgWord}
                onChange={(e) => setImgWord(e.target.value)}
                autoFocus
                disabled={imgUploading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />

              {imgPreview ? (
                <div className="relative w-full h-28 rounded-xl overflow-hidden border border-border group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setImgWord(""); setImgPreview(""); if (imgFileRef.current) imgFileRef.current.value = ""; }}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => imgFileRef.current?.click()}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex items-center justify-center gap-2 text-muted-foreground transition-colors"
                >
                  <ImageIcon size={18} className="opacity-50" />
                  <span className="text-sm">Click to upload image</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" ref={imgFileRef} onChange={handleImageSelect} />

              <button
                type="submit"
                disabled={!imgWord.trim() || !imgPreview || imgUploading}
                className="w-full py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform"
              >
                {imgUploading ? "Uploading..." : "Add Image Item"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
