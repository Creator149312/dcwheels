"use client";

/**
 * YouTube-style tag input with live autocomplete.
 *
 * Features:
 *   - Chip-style rendering of currently-attached tags. Click × or press
 *     Backspace on empty input to remove the last chip.
 *   - Fetches prefix-matched popular tags from /api/tags/autocomplete
 *     (debounced 250ms). Arrow keys navigate, Enter adds the highlighted
 *     suggestion, Escape closes the menu.
 *   - Enter / comma / tab on the input (with no selected suggestion)
 *     adds the current text as a new tag.
 *   - Tags are normalised to lowercase + trimmed. Duplicates are ignored.
 *   - Soft cap at MAX_TAGS to prevent abuse.
 */

import { useEffect, useRef, useState } from "react";

const MAX_TAGS = 8;
const DEBOUNCE_MS = 250;

function normalise(s) {
  return (typeof s === "string" ? s : "").trim().toLowerCase();
}

export default function TagInput({ value, onChange, placeholder }) {
  const tags = Array.isArray(value) ? value : [];

  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [highlight, setHighlight] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch suggestions (debounced). Aborts any in-flight request when the
  // user types again so we don't race stale responses back into the UI.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = input.trim();
    if (q.length === 0) {
      setSuggestions([]);
      setOpen(false);
      setHighlight(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/tags/autocomplete?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) return;
        const json = await res.json();
        const filtered = (json.tags || []).filter(
          (t) => !tags.includes(normalise(t.name))
        );
        setSuggestions(filtered);
        setOpen(filtered.length > 0);
        setHighlight(filtered.length > 0 ? 0 : -1);
      } catch (err) {
        if (err.name !== "AbortError") {
          // Swallow network errors — the user can still press Enter to
          // add a free-form tag.
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, tags.join("|")]);

  function addTag(raw) {
    const tag = normalise(raw);
    if (!tag) return;
    if (tags.includes(tag)) {
      setInput("");
      return;
    }
    if (tags.length >= MAX_TAGS) return;
    onChange?.([...tags, tag]);
    setInput("");
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
  }

  function removeTag(tag) {
    onChange?.(tags.filter((t) => t !== tag));
  }

  function handleKeyDown(e) {
    if (e.key === "ArrowDown") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      // Tab without autocomplete open → default tab behaviour (field
      // navigation). Only intercept Tab when there's an active suggestion.
      if (e.key === "Tab" && (!open || highlight < 0)) return;
      e.preventDefault();
      if (open && highlight >= 0 && suggestions[highlight]) {
        addTag(suggestions[highlight].name);
      } else if (input.trim()) {
        addTag(input);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    } else if (e.key === "Backspace" && input.length === 0 && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="relative">
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[40px] w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm focus-within:ring-2 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-medium"
          >
            {t}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(t);
              }}
              className="text-blue-700/70 dark:text-blue-300/70 hover:text-blue-900 dark:hover:text-blue-100"
              aria-label={`Remove tag ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={
            tags.length === 0
              ? placeholder || "Add tags (e.g. anime, action, fun)"
              : tags.length >= MAX_TAGS
              ? `Max ${MAX_TAGS} tags`
              : ""
          }
          disabled={tags.length >= MAX_TAGS}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-0.5"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {suggestions.map((s, i) => (
            <button
              type="button"
              key={s.name}
              // onMouseDown (not onClick) so it fires before the input's
              // onBlur closes the menu.
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s.name);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex items-center justify-between w-full text-left px-3 py-2 text-sm ${
                i === highlight ? "bg-muted" : ""
              }`}
            >
              <span>{s.name}</span>
              <span className="text-xs text-muted-foreground">
                {s.count.toLocaleString()} wheel{s.count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-1.5">
        Press Enter or comma to add a tag. {tags.length}/{MAX_TAGS} used.
      </p>
    </div>
  );
}
