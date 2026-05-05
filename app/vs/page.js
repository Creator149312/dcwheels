"use client";
/**
 * /vs  — Side-by-side content comparison page
 *
 * URL params:
 *   ?type=movie|anime|game|tv   — content type (default: movie)
 *   ?a=<title>                  — pre-fill slot A with this title
 *   ?aSlug=<slug>               — pre-fill slot A poster/slug
 *   ?aPoster=<url>              — pre-fill slot A poster image
 *
 * The page lets users search for and select two content items,
 * then shows a side-by-side comparison card.
 * "Post to Community" hands off to /ask/create with both items pre-filled.
 */
import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";

const TYPE_LABELS = {
  movie:     "Movie",
  anime:     "Anime",
  tv:        "TV Show",
  game:      "Game",
  character: "Character",
};

// ── Search slot ──────────────────────────────────────────────────────────────
function SearchSlot({ type, label, initial, onSelect }) {
  const [query, setQuery]   = useState(initial?.title || "");
  const [results, setResults] = useState([]);
  const [open, setOpen]     = useState(false);
  const [selected, setSelected] = useState(initial || null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    // game/character don't have a catalog search endpoint — show text-only slot
    if (!["movie", "tv", "anime"].includes(type)) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/catalog/search?type=${type}&q=${encodeURIComponent(q)}&limit=6`);
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [type]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    onSelect(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 320);
  };

  const handleSelect = (item) => {
    setSelected(item);
    setQuery(item.title);
    setResults([]);
    setOpen(false);
    onSelect(item);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    onSelect(null);
  };

  return (
    <div ref={wrapRef} className="flex flex-col gap-3">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {label}
      </p>

      {/* Poster / placeholder card */}
      <div className="relative mx-auto w-36 h-48 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-md flex items-center justify-center">
        {selected?.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.posterUrl} alt={selected.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl opacity-20">🎬</span>
        )}
        {selected && (
          <button
            onClick={handleClear}
            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80"
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {/* Title (when selected) */}
      {selected && (
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2">
            {selected.title}
          </p>
          {selected.year && (
            <p className="text-xs text-gray-400 mt-0.5">{selected.year}</p>
          )}
          {selected.rating && (
            <p className="text-xs text-amber-500 font-semibold mt-0.5">★ {selected.rating}</p>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={`Search ${TYPE_LABELS[type] || type}…`}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm
                     outline-none focus:border-blue-500 transition-colors
                     placeholder-gray-400 dark:placeholder-gray-500"
        />
        {loading && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs animate-pulse">
            …
          </span>
        )}

        {open && results.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 top-full mt-1
                         bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                         rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
            {results.map((item) => (
              <li key={item.externalId}>
                <button
                  onMouseDown={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5
                             hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  {item.posterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.posterUrl} alt="" className="w-8 h-11 object-cover rounded-md shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      {[item.year, item.rating ? `★ ${item.rating}` : null].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── VS divider ────────────────────────────────────────────────────────────────
function VsDivider() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-2 mt-14">
      <div className="w-px flex-1 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent max-h-16" />
      <span className="text-2xl font-black text-gray-300 dark:text-gray-600 select-none">VS</span>
      <div className="w-px flex-1 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent max-h-16" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function VsPageInner() {
  const searchParams = useSearchParams();
  const type     = searchParams.get("type") || "movie";
  const aTitle   = searchParams.get("a")    || "";
  const aPoster  = searchParams.get("aPoster") || null;
  const aSlug    = searchParams.get("aSlug")   || null;

  const initialA = aTitle
    ? { title: aTitle, posterUrl: aPoster, canonicalSlug: aSlug, year: null, rating: null }
    : null;

  const [itemA, setItemA] = useState(initialA);
  const [itemB, setItemB] = useState(null);

  const typeLabel = TYPE_LABELS[type] || type;

  // Build the /ask/create URL when both items are chosen
  const askHref = (() => {
    if (!itemA || !itemB) return null;
    const q = `${itemA.title} vs ${itemB.title} — which is better?`;
    const opts = `${itemA.title}|${itemB.title}`;
    return `/ask/create?type=${type}&q=${encodeURIComponent(q)}&opts=${encodeURIComponent(opts)}`;
  })();

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-extrabold text-center mb-1">
          {typeLabel} vs {typeLabel}
        </h1>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-10">
          Pick two {typeLabel.toLowerCase()}s and post to the community to settle it.
        </p>

        {/* Slots row */}
        <div className="flex items-start gap-2 sm:gap-4">
          <div className="flex-1 min-w-0">
            <SearchSlot
              type={type}
              label="Pick first"
              initial={initialA}
              onSelect={setItemA}
            />
          </div>
          <VsDivider />
          <div className="flex-1 min-w-0">
            <SearchSlot
              type={type}
              label="Pick second"
              initial={null}
              onSelect={setItemB}
            />
          </div>
        </div>

        {/* CTA — only shown once both are selected */}
        {askHref && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              <strong className="text-gray-900 dark:text-white">{itemA.title}</strong>
              {" vs "}
              <strong className="text-gray-900 dark:text-white">{itemB.title}</strong>
              {" — ask the community!"}
            </p>
            <a
              href={askHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                         bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm
                         shadow-md active:scale-95 transition-all"
            >
              💬 Post to Community
            </a>
          </div>
        )}

        {/* Hint when nothing is selected yet */}
        {!itemA && !itemB && (
          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-600">
            Search for two {typeLabel.toLowerCase()}s above to get started.
          </p>
        )}
      </div>
    </main>
  );
}

export default function VsPage() {
  return (
    <Suspense>
      <VsPageInner />
    </Suspense>
  );
}
