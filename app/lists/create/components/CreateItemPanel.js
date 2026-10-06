"use client";

import { useState, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  Image as ImageIcon,
  Plus,
  Loader2,
  ArrowRight,
  Layers,
  Sparkles,
  Film,
  Gamepad2,
  User,
  Zap,
  X,
} from "lucide-react";

const TYPE_CONFIG = {
  anime: { label: "Anime", icon: Sparkles, color: "text-purple-600 bg-purple-500/10 border-purple-500/20" },
  movie: { label: "Movie", icon: Film, color: "text-blue-600 bg-blue-500/10 border-blue-500/20" },
  tv: { label: "TV", icon: Film, color: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
  game: { label: "Game", icon: Gamepad2, color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" },
  character: { label: "Character", icon: User, color: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  wheel: { label: "Wheel", icon: Zap, color: "text-rose-600 bg-rose-500/10 border-rose-500/20" },
};

export default function CreateItemPanel({ onAddItem, onAddBulkItems }) {
  const [activeMode, setActiveMode] = useState("search"); // "search" | "bulk" | "image"
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef(null);

  // Bulk state
  const [bulkText, setBulkText] = useState("");

  // Image state
  const [imgWord, setImgWord] = useState("");
  const [imgPreview, setImgPreview] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const imgFileRef = useRef(null);

  // Debounced catalog search
  useEffect(() => {
    if (activeMode !== "search") return;
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
  }, [query, activeMode]);

  function triggerHaptic() {
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore vibration error on unsupported platforms
    }
  }

  function handleSelectEntity(item) {
    triggerHaptic();
    onAddItem({
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
    setSelectedIdx(-1);
    // Keep focus so user can immediately type the next item without extra taps
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }

  function handleAddWordItem(text) {
    const trimmed = text?.trim();
    if (!trimmed) return;
    triggerHaptic();
    onAddItem({ type: "word", word: trimmed, wordData: "" });
    setQuery("");
    setSuggestions([]);
    setSelectedIdx(-1);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  }

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
        handleAddWordItem(query);
      }
    }
  }

  function handleBulkSubmit(e) {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const words = bulkText
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (words.length === 0) return;

    onAddBulkItems(words);
    setBulkText("");
  }

  function handleImageSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      if (imgFileRef.current) imgFileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImgPreview(reader.result);
    reader.readAsDataURL(file);
  }

  async function handleImageSubmit(e) {
    e.preventDefault();
    if (!imgWord.trim() || !imgPreview) return;

    setImgUploading(true);
    let resolvedUrl = imgPreview;

    if (imgPreview.startsWith("data:")) {
      try {
        const res = await fetch("/api/upload-segment-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl: imgPreview }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.url) resolvedUrl = data.url;
        }
      } catch (err) {
        console.warn("Image upload failed, fallback to data url", err);
      }
    }

    onAddItem({
      type: "word",
      word: imgWord.trim(),
      wordData: resolvedUrl,
    });

    setImgWord("");
    setImgPreview("");
    setImgUploading(false);
    if (imgFileRef.current) imgFileRef.current.value = "";
    setActiveMode("search");
  }

  return (
    <div className="space-y-2">
      {/* ── Main Unified Omnibar ── */}
      <div className="relative flex items-center bg-card border border-border/80 focus-within:border-violet-500/60 focus-within:ring-2 focus-within:ring-violet-500/20 rounded-2xl shadow-xs transition-all">
        <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-muted-foreground">
          {searchLoading ? (
            <Loader2 size={16} className="animate-spin text-violet-600" />
          ) : (
            <Search size={16} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (activeMode !== "search") setActiveMode("search");
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add item or search catalog..."
          className="w-full py-2.5 bg-transparent text-sm focus:outline-none font-medium placeholder:text-muted-foreground/60"
        />

        {/* Action buttons on the right side of the bar */}
        <div className="flex items-center gap-1 pr-2 shrink-0">
          {query.trim() ? (
            <button
              type="button"
              onClick={() => handleAddWordItem(query)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95"
            >
              <span>Add</span>
              <ArrowRight size={12} />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setActiveMode(activeMode === "bulk" ? "search" : "bulk")}
                title="Paste items in bulk"
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  activeMode === "bulk"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <FileText size={13} />
                <span className="hidden sm:inline">Bulk</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMode(activeMode === "image" ? "search" : "image")}
                title="Upload image item"
                className={`inline-flex items-center gap-1 p-1 sm:px-2.5 sm:py-1 text-xs font-semibold rounded-lg transition-colors ${
                  activeMode === "image"
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <ImageIcon size={14} />
                <span className="hidden sm:inline">Image</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Catalog Search Autocomplete Dropdown */}
      {activeMode === "search" && suggestions.length > 0 && (
        <div className="border border-border rounded-xl bg-card divide-y divide-border/60 max-h-64 overflow-y-auto shadow-lg z-20">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
            Catalog Matches
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
                  isSelected
                    ? "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400"
                    : "hover:bg-muted/60 text-foreground"
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

                <div className="shrink-0 text-xs font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1">
                  <Plus size={14} />
                  <span className="hidden sm:inline">Add</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Inline Bulk Drawer ── */}
      {activeMode === "bulk" && (
        <form
          onSubmit={handleBulkSubmit}
          className="bg-card border border-border/80 rounded-2xl p-3.5 space-y-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <FileText size={14} className="text-violet-600" />
              <span>Bulk Paste (one item per line)</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveMode("search")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={4}
            placeholder={"Spider-Man\nIron Man\nCaptain America\nThor\nBlack Panther"}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-none font-medium"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveMode("search")}
              className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!bulkText.trim()}
              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform flex items-center gap-1.5 shadow-xs"
            >
              <Plus size={13} />
              <span>Add Items</span>
            </button>
          </div>
        </form>
      )}

      {/* ── Inline Image Drawer ── */}
      {activeMode === "image" && (
        <form
          onSubmit={handleImageSubmit}
          className="bg-card border border-border/80 rounded-2xl p-3.5 space-y-3 shadow-xs animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ImageIcon size={14} className="text-violet-600" />
              <span>Add Custom Image Item</span>
            </span>
            <button
              type="button"
              onClick={() => setActiveMode("search")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          <input
            type="text"
            placeholder="Item title (e.g. Character or item name)..."
            value={imgWord}
            onChange={(e) => setImgWord(e.target.value)}
            disabled={imgUploading}
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 font-medium"
            autoFocus
          />

          {imgPreview ? (
            <div className="relative w-full h-24 rounded-xl overflow-hidden border border-border group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
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
              className="w-full h-16 rounded-xl border-2 border-dashed border-border hover:border-violet-500/50 hover:bg-muted/40 cursor-pointer flex items-center justify-center gap-2 text-muted-foreground transition-colors"
            >
              <ImageIcon size={16} className="opacity-50" />
              <span className="text-xs font-medium">Click to choose image file</span>
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={imgFileRef}
            onChange={handleImageSelect}
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveMode("search")}
              className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!imgWord.trim() || !imgPreview || imgUploading}
              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg active:scale-95 transition-transform flex items-center gap-1.5 shadow-xs"
            >
              {imgUploading && <Loader2 size={13} className="animate-spin" />}
              <span>{imgUploading ? "Uploading..." : "Add Image Item"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}