"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Search, Image as ImageIcon, Sparkles, Film, Gamepad2, User, Zap, Layers, FileText, Loader2, ArrowRight } from "lucide-react";

const TYPE_CONFIG = {
  anime: { label: "Anime", icon: Sparkles, color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  movie: { label: "Movie", icon: Film, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  tv: { label: "TV", icon: Film, color: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
  game: { label: "Game", icon: Gamepad2, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  character: { label: "Character", icon: User, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  wheel: { label: "Wheel", icon: Zap, color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
};

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
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef(null);

  // Auto-focus input when panel opens in search / omnibox mode
  useEffect(() => {
    if (addPanelMode === "search" || addPanelMode === "text") {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [addPanelMode]);

  // Live autosuggest with debouncing
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setSearchLoading(false);
      setSelectedIdx(-1);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/wheel/suggest?query=${encodeURIComponent(query.trim())}`, {
          signal: controller.signal,
          headers: { "cache-control": "max-age=600" },
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setSelectedIdx(-1);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Catalog search error:", err);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  if (!isOwner || isSystemList || addPanelMode === null) return null;

  // Handle adding an entity from suggestions
  function handleSelectEntity(item) {
    addItem({
      type: "entity",
      entityType: item.type,
      entityId: item.id || item._id,
      name: item.title,
      slug: item.slug,
      image: item.cover || null,
      status: "want",
    });
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  }

  // Handle Enter press (either select active highlighted item or add as quick text)
  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        handleSelectEntity(suggestions[selectedIdx]);
      } else if (query.trim()) {
        addItem({ type: "word", word: query.trim(), wordData: "" });
        setQuery("");
        setSuggestions([]);
      }
    } else if (e.key === "Escape") {
      setAddPanelMode(null);
    }
  }

  return (
    <div className="mb-6">
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center border-b border-border/60 bg-muted/20 px-2 sm:px-3">
          <button
            onClick={() => setAddPanelMode("search")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${
              addPanelMode === "search" || addPanelMode === "text"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search size={13} />
            <span>Search & Add</span>
          </button>
          <button
            onClick={() => setAddPanelMode("bulk")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${
              addPanelMode === "bulk"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={13} />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => setAddPanelMode("image")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-colors ${
              addPanelMode === "image"
                ? "text-primary border-b-2 border-primary bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ImageIcon size={13} />
            <span>Custom Image</span>
          </button>

          <button
            onClick={() => setAddPanelMode(null)}
            className="ml-auto p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── 1. Omnibox / Search & Quick Add ───────────────────────────── */}
        {(addPanelMode === "search" || addPanelMode === "text") && (
          <div className="p-3 sm:p-4 space-y-3">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
                {searchLoading ? (
                  <Loader2 size={16} className="animate-spin text-primary" />
                ) : (
                  <Search size={16} />
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search anime, movies, games, characters, or type any item & press Enter..."
                className="w-full pl-10 pr-24 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium"
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center gap-1.5">
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      addItem({ type: "word", word: query.trim(), wordData: "" });
                      setQuery("");
                      setSuggestions([]);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg shadow-2xs hover:bg-primary/90 transition-all active:scale-95"
                  >
                    <span>Add</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Suggestions dropdown list */}
            {suggestions.length > 0 && (
              <div className="border border-border rounded-xl bg-background divide-y divide-border/60 max-h-72 overflow-y-auto shadow-md">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                  Catalog Matches (Click to Add)
                </div>
                {suggestions.map((item, idx) => {
                  const cfg = TYPE_CONFIG[item.type] || {
                    label: item.type,
                    icon: Layers,
                    color: "text-muted-foreground bg-muted border-border",
                  };
                  const Icon = cfg.icon;
                  const isSelected = idx === selectedIdx;

                  return (
                    <button
                      key={`${item.type}-${item.id || item._id || idx}`}
                      type="button"
                      onClick={() => handleSelectEntity(item)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      {item.cover ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={item.cover}
                          alt={item.title}
                          className="w-8 h-10 rounded object-cover border border-border shrink-0 bg-muted"
                        />
                      ) : (
                        <div className="w-8 h-10 rounded bg-muted/80 border border-border flex items-center justify-center shrink-0 text-muted-foreground">
                          <Icon size={14} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{item.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold border ${cfg.color}`}
                          >
                            <Icon size={10} />
                            {cfg.label}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100">
                        <Plus size={14} />
                        <span className="hidden sm:inline">Add</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[11px] text-muted-foreground px-1">
              💡 <strong>Tip:</strong> Press <strong>Enter</strong> to instantly add whatever you type, or pick from official matches with posters.
            </p>
          </div>
        )}

        {/* ── 2. Bulk Import ────────────────────────────────────────────── */}
        {addPanelMode === "bulk" && (
          <form onSubmit={handleBulkSubmit} className="p-3 sm:p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Paste Multiple Items (One per line)
              </label>
              <textarea
                name="bulkText"
                rows={6}
                autoFocus
                placeholder={"Attack on Titan\nDeath Note\nFullmetal Alchemist\nDemon Slayer"}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none font-medium"
                disabled={bulkLoading}
              />
            </div>
            <button
              type="submit"
              disabled={bulkLoading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {bulkLoading && <Loader2 size={14} className="animate-spin" />}
              {bulkLoading ? "Importing..." : "Import All Items"}
            </button>
          </form>
        )}

        {/* ── 3. Image Upload ───────────────────────────────────────────── */}
        {addPanelMode === "image" && (
          <form onSubmit={handleImageSubmit} className="p-3 sm:p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Item Title
              </label>
              <input
                type="text"
                placeholder="Item name (e.g. Mario, Pizza...)"
                value={imgWord}
                onChange={(e) => setImgWord(e.target.value)}
                autoFocus
                disabled={imgUploading}
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {imgPreview ? (
              <div className="relative w-full h-28 rounded-xl overflow-hidden border border-border group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImgWord("");
                    setImgPreview("");
                    if (imgFileRef.current) imgFileRef.current.value = "";
                  }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div
                onClick={() => imgFileRef.current?.click()}
                className="w-full h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex items-center justify-center gap-2 text-muted-foreground transition-colors"
              >
                <ImageIcon size={18} className="opacity-50" />
                <span className="text-sm font-medium">Click to choose image file</span>
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" ref={imgFileRef} onChange={handleImageSelect} />

            <button
              type="submit"
              disabled={!imgWord.trim() || !imgPreview || imgUploading}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground text-xs font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {imgUploading && <Loader2 size={14} className="animate-spin" />}
              {imgUploading ? "Uploading..." : "Add Image Item"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
