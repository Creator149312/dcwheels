"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User, Globe, Hash, Film, Tv, Gamepad2, Lock, Plus, Layers, Disc3, Check } from "lucide-react";

const TYPE_ICONS = {
  anime: Tv,
  movie: Film,
  game: Gamepad2,
  character: User,
  wheel: Disc3,
  list: Layers,
};

const TYPE_LABELS = {
  anime: "Anime",
  movie: "Movie",
  game: "Game",
  character: "Character",
  wheel: "Wheel",
  list: "List",
};

const MAX_ENTITIES = 2;

/**
 * DestinationSelector
 *
 * Allows users to choose which Topic(s) their content anchors to,
 * or post to their General Profile / Feed.
 *
 * Props:
 * - value: Array of entity objects: [{ type, externalId, slug, title, image }]
 * - onChange: (entities: Array) => void
 * - locked: boolean (if true, the first entity cannot be removed, e.g. on Topic Pages)
 * - onAddTagFallback?: (tag: string) => void (called if user chooses to tag an unlisted topic)
 * - maxEntities?: number (default 2)
 */
export default function DestinationSelector({
  value = [],
  onChange,
  locked = false,
  onAddTagFallback,
  maxEntities = MAX_ENTITIES,
}) {
  const selectedEntities = Array.isArray(value) ? value : [];
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsSearching(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search against canonical TopicPages
  const searchTopics = useCallback(
    (text) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();

      const q = text.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      debounceTimerRef.current = setTimeout(async () => {
        const ctrl = new AbortController();
        abortControllerRef.current = ctrl;

        try {
          const res = await fetch(`/api/topicpage/autocomplete?q=${encodeURIComponent(q)}`, {
            signal: ctrl.signal,
          });
          if (!res.ok) throw new Error("Search failed");
          const data = await res.json();

          // Filter out already selected entities
          const available = (data.topics || []).filter(
            (t) =>
              !selectedEntities.some(
                (s) =>
                  String(s.externalId) === String(t.id) ||
                  (s.slug && t.slug && s.slug === t.slug)
              )
          );
          setSuggestions(available);
          setIsOpen(true);
        } catch (err) {
          if (err.name !== "AbortError") {
            setSuggestions([]);
          }
        } finally {
          setIsLoading(false);
        }
      }, 220);
    },
    [selectedEntities]
  );

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);
    searchTopics(text);
  };

  const handleSelectTopic = (topic) => {
    if (selectedEntities.length >= maxEntities) return;

    const newEntity = {
      type: topic.type,
      externalId: String(topic.id),
      slug: topic.slug,
      title: topic.title,
      image: topic.cover || null,
      segmentCount: 0,
    };

    onChange?.([...selectedEntities, newEntity]);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    setIsSearching(false);
  };

  const handleRemoveEntity = (index) => {
    if (locked && index === 0) return; // Locked entity cannot be deleted
    const updated = selectedEntities.filter((_, i) => i !== index);
    onChange?.(updated);
  };

  const handleCreateTagFallback = () => {
    const rawTag = query.trim().replace(/^#/, "");
    if (!rawTag) return;
    onAddTagFallback?.(rawTag);
    setQuery("");
    setIsOpen(false);
    setIsSearching(false);
  };

  const canAddMore = selectedEntities.length < maxEntities;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Label Row */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1.5 px-0.5">
        <span className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" />
          <span>Post Destination</span>
        </span>
        <span className="text-[11px] text-muted-foreground/70">
          {selectedEntities.length === 0
            ? "General Feed & Profile"
            : `${selectedEntities.length} of ${maxEntities} topics linked`}
        </span>
      </div>

      {/* Main Bar / Selected Chips Container */}
      <div
        className={`flex flex-wrap items-center gap-2 p-2 rounded-xl border transition-all ${
          isOpen || isSearching
            ? "border-primary/50 bg-background shadow-xs ring-2 ring-primary/10"
            : "border-border/60 bg-muted/20 hover:border-border"
        }`}
      >
        {/* Selected Topic Chips */}
        {selectedEntities.map((entity, idx) => {
          const Icon = TYPE_ICONS[entity.type] || Hash;
          const isEntityLocked = locked && idx === 0;

          return (
            <div
              key={`${entity.type}-${entity.externalId || entity.slug || idx}`}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-background border border-border/80 shadow-2xs text-xs font-medium text-foreground max-w-[220px] sm:max-w-[260px] truncate animate-in fade-in zoom-in-95 duration-150"
            >
              {entity.image ? (
                <img
                  src={entity.image}
                  alt={entity.title}
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
              ) : (
                <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <span className="truncate" title={entity.title}>
                {entity.title || entity.slug}
              </span>
              {isEntityLocked ? (
                <span
                  title="Locked to this Topic Page"
                  className="text-muted-foreground/60 ml-0.5 shrink-0"
                >
                  <Lock className="w-3 h-3" />
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemoveEntity(idx)}
                  className="text-muted-foreground hover:text-destructive transition-colors ml-0.5 p-0.5 rounded-full hover:bg-muted"
                  aria-label={`Remove ${entity.title}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* Empty state pill when 0 entities */}
        {selectedEntities.length === 0 && !isSearching && (
          <button
            type="button"
            onClick={() => {
              setIsSearching(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/40 border border-dashed border-border/70 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
          >
            <User className="w-3.5 h-3.5 text-muted-foreground/70" />
            <span>My Profile (General)</span>
            <span className="text-[10px] text-primary font-bold ml-1">+ Link to a Topic</span>
          </button>
        )}

        {/* Add / Search input field */}
        {canAddMore && isSearching && (
          <div className="flex-1 min-w-[140px] flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              onFocus={() => {
                if (suggestions.length > 0) setIsOpen(true);
              }}
              placeholder={
                selectedEntities.length === 0
                  ? "Search topic (e.g. Naruto, Elden Ring)..."
                  : "Add 2nd topic for cross-over / VS..."
              }
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden py-0.5"
            />
            {isLoading && (
              <span className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
            )}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setIsSearching(false);
                setIsOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              title="Cancel search"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* "+ Add Topic" trigger button when not actively searching */}
        {canAddMore && !isSearching && selectedEntities.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setIsSearching(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add VS / Topic</span>
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-popover text-popover-foreground border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-border/20">
            {suggestions.length > 0 ? (
              suggestions.map((topic) => {
                const Icon = TYPE_ICONS[topic.type] || Hash;
                const typeLabel = TYPE_LABELS[topic.type] || topic.type;

                return (
                  <button
                    key={`${topic.type}-${topic.id}`}
                    type="button"
                    onClick={() => handleSelectTopic(topic)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-muted/60 transition-colors group"
                  >
                    {topic.cover ? (
                      <img
                        src={topic.cover}
                        alt={topic.title}
                        className="w-8 h-11 rounded-sm object-cover shrink-0 bg-muted border border-border/40 shadow-2xs"
                      />
                    ) : (
                      <div className="w-8 h-11 rounded-sm bg-muted flex items-center justify-center shrink-0 border border-border/40 text-muted-foreground">
                        <Icon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.2 rounded-xs">
                          {typeLabel}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-foreground truncate mt-0.5 group-hover:text-primary transition-colors">
                        {topic.title}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                      Select
                    </span>
                  </button>
                );
              })
            ) : query.trim().length >= 2 && !isLoading ? (
              <div className="p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  No official topic page found for &ldquo;{query}&rdquo;.
                </p>
                {onAddTagFallback && (
                  <button
                    type="button"
                    onClick={handleCreateTagFallback}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-colors"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Tag as #{query.trim().replace(/^#/, "")} instead</span>
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
