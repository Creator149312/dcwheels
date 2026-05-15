"use client";

import { Suspense, useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { Plus, Trash2, Loader2, X, Search } from "lucide-react";
import toast from "react-hot-toast";

const MAX_OPTIONS = 4;
const MIN_OPTIONS = 2;

const TOPIC_TYPES = [
  { value: "movie",   label: "Movies",      icon: "ðŸŽ¬" },
  { value: "tv",      label: "TV Shows",    icon: "ðŸ“º" },
  { value: "anime",   label: "Anime",       icon: "â›©ï¸" },
  { value: "general", label: "Anything",    icon: "ðŸ’¬" },
];

const QUESTION_TEMPLATES = {
  movie:   ["Which should I watch first?", "Which is better?", "Which is more rewatchable?"],
  tv:      ["Which should I binge next?", "Which is better overall?", "Which has a better ending?"],
  anime:   ["Which should I watch first?", "Which has better animation?", "Which is more addictive?"],
  general: [],
};

function emptyOption() {
  return { text: "", catalogRef: null };
}

// â”€â”€ Catalog search slot â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CatalogOptionSlot({ option, index, topicType, onSelect, onClear, onRemove, canRemove }) {
  const [query, setQuery] = useState(option.catalogRef ? option.text : "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/catalog/search?type=${topicType}&q=${encodeURIComponent(q)}&limit=5`);
      const data = await res.json();
      setResults(data.results || []);
      setOpen(true);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, [topicType]);

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (item) => {
    onSelect(index, item);
    setQuery(item.title);
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    onClear(index);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  // â”€â”€ Selected state â€” poster card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (option.catalogRef) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/10 px-3 py-2.5">
        <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold">
          {index + 1}
        </span>
        {option.catalogRef.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={option.catalogRef.posterUrl}
            alt={option.text}
            className="h-11 w-8 object-cover rounded shadow-sm shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{option.text}</p>
          {option.catalogRef.metadata?.year && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{option.catalogRef.metadata.year}</p>
          )}
        </div>
        <button type="button" onClick={handleClear} className="text-gray-400 hover:text-red-500 transition-colors shrink-0" aria-label="Remove selection">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // â”€â”€ Unselected state â€” search input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold">
          {index + 1}
        </span>
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder={`Search for option ${index + 1}â€¦`}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white px-4 py-2.5 pr-9 text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {searching
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Search className="h-4 w-4" />}
          </span>
        </div>
        {canRemove && (
          <button type="button" onClick={() => onRemove(index)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove option">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 left-8 right-0 top-full mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] shadow-xl overflow-hidden">
          {results.map((item) => (
            <button
              key={item.externalId}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left border-b border-gray-100 dark:border-gray-800 last:border-0"
            >
              {item.posterUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.posterUrl} alt={item.title} className="h-10 w-7 object-cover rounded shadow-sm shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.title}</p>
                <p className="text-xs text-gray-400">
                  {item.year || ""}
                  {item.rating ? ` Â· â˜… ${item.rating}` : ""}
                  {item.genres?.length ? ` Â· ${item.genres.slice(0, 2).join(", ")}` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Main form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreateAskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const preQ    = searchParams.get("q")      || "";
  const preOpts = searchParams.get("opts")   || "";
  const preFrom = searchParams.get("from")   || "";
  const topicPageId = searchParams.get("topicPageId") || null;

  const [topicType, setTopicType] = useState("general");
  const [question, setQuestion]   = useState(preQ);
  const [options, setOptions]     = useState(() => {
    if (preOpts) {
      const parsed = preOpts.split("|").map((o) => o.trim()).filter(Boolean).slice(0, MAX_OPTIONS);
      if (parsed.length >= MIN_OPTIONS) return parsed.map((text) => ({ ...emptyOption(), text }));
    }
    return [emptyOption(), emptyOption()];
  });
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [tags, setTags]           = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-populate tags from genres of all selected catalog items
  useEffect(() => {
    if (topicType === "general") return;
    const allGenres = options
      .flatMap((o) => o.catalogRef?.metadata?.genres || [])
      .map((g) => g.toLowerCase().trim());
    const unique = [...new Set(allGenres)].slice(0, 5);
    if (unique.length > 0) setTags(unique.join(", "));
  }, [options, topicType]);

  if (!session) {
    openLoginPrompt?.();
    return (
      <main className="max-w-2xl mx-auto p-4 sm:p-6 text-center text-gray-500 dark:text-gray-400 py-20">
        <p className="text-lg font-medium">Please sign in to ask a question.</p>
      </main>
    );
  }

  const switchTopicType = (type) => {
    setTopicType(type);
    // Restore pre-filled options when switching to general, else reset
    if (type === "general" && preOpts) {
      const parsed = preOpts.split("|").map((o) => o.trim()).filter(Boolean).slice(0, MAX_OPTIONS);
      setOptions(parsed.length >= MIN_OPTIONS ? parsed.map((text) => ({ ...emptyOption(), text })) : [emptyOption(), emptyOption()]);
    } else {
      setOptions([emptyOption(), emptyOption()]);
    }
    if (type === "general") setTags("");
  };

  const addOption    = () => { if (options.length < MAX_OPTIONS) setOptions([...options, emptyOption()]); };
  const removeOption = (i) => { if (options.length > MIN_OPTIONS) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateText   = (i, val) => { const next = [...options]; next[i] = { ...next[i], text: val }; setOptions(next); };

  const selectCatalogItem = (i, item) => {
    const next = [...options];
    next[i] = {
      text: item.title,
      catalogRef: {
        type: item.type,
        externalId: item.externalId,
        canonicalSlug: item.canonicalSlug,
        posterUrl: item.posterUrl,
        metadata: { year: item.year, rating: item.rating, genres: item.genres || [] },
      },
    };
    setOptions(next);
  };

  const clearCatalogItem = (i) => {
    const next = [...options];
    next[i] = emptyOption();
    setOptions(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return toast.error("Enter your question");

    const cleanOptions = options
      .map((o) => ({ text: o.text.trim(), catalogRef: o.catalogRef || undefined }))
      .filter((o) => o.text);
    if (cleanOptions.length < MIN_OPTIONS) return toast.error(`Add at least ${MIN_OPTIONS} options`);

    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    setSubmitting(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          options: cleanOptions,
          expiresInHours: Number(expiresInHours),
          tags: tagList,
          topicType: topicType !== "general" ? topicType : undefined,
          topicTags: tagList,
          derivedFromWheelId: searchParams.get("wheelId") || undefined,
          topicPageId,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create dilemma"); return; }
      toast.success("Your dilemma is live!");
      router.push(`/ask/${data.id}`);
    } catch { toast.error("Something went wrong. Try again."); }
    finally { setSubmitting(false); }
  };

  const isCatalog = topicType !== "general";
  const catalogCount = options.filter((o) => o.catalogRef).length;
  const templates = QUESTION_TEMPLATES[topicType] || [];

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Ask the Community</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
          Post a decision you&apos;re stuck on and let the community help.
        </p>
        {preFrom && (
          <div className="mt-3 flex items-center gap-2 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-3 py-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            Pre-filled from your <span className="font-bold mx-1">{decodeURIComponent(preFrom)}</span> wheel â€” edit as needed.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* â”€â”€ Step 1: Topic type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            What&apos;s this about?
          </label>
          <div className="flex flex-wrap gap-2">
            {TOPIC_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => switchTopicType(t.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                  topicType === t.value
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-white dark:bg-[#1f1f1f] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600"
                }`}
              >
                <span>{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          {isCatalog && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Search for titles â€” posters and metadata fill automatically.
            </p>
          )}
        </div>

        {/* â”€â”€ Step 2: Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Options <span className="text-red-500">*</span>{" "}
            <span className="font-normal text-gray-400">(2â€“4)</span>
          </label>
          <div className="space-y-2">
            {options.map((opt, i) =>
              isCatalog ? (
                <CatalogOptionSlot
                  key={i}
                  option={opt}
                  index={i}
                  topicType={topicType}
                  onSelect={selectCatalogItem}
                  onClear={clearCatalogItem}
                  onRemove={removeOption}
                  canRemove={options.length > MIN_OPTIONS}
                />
              ) : (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => updateText(i, e.target.value)}
                    maxLength={100}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white px-4 py-2.5 text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  {options.length > MIN_OPTIONS && (
                    <button type="button" onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove option">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )
            )}
          </div>
          {options.length < MAX_OPTIONS && (
            <button type="button" onClick={addOption} className="mt-3 inline-flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium">
              <Plus className="h-4 w-4" />
              Add another option
            </button>
          )}
        </div>

        {/* â”€â”€ Step 3: Question (with template chips for catalog) â”€â”€â”€ */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Your question <span className="text-red-500">*</span>
          </label>
          {isCatalog && catalogCount >= 2 && templates.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setQuestion(tpl)}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    question === tpl
                      ? "bg-purple-600 text-white border-purple-600"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-purple-400 dark:hover:border-purple-600 hover:text-purple-600 dark:hover:text-purple-400"
                  }`}
                >
                  {tpl}
                </button>
              ))}
            </div>
          )}
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={isCatalog ? "e.g. Which should I watch first?" : "e.g. Should I quit my job to travel for a year?"}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white px-4 py-3 text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{question.length}/500</p>
        </div>

        {/* â”€â”€ Expiry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Close voting after
          </label>
          <select
            value={expiresInHours}
            onChange={(e) => setExpiresInHours(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value={1}>1 hour</option>
            <option value={6}>6 hours</option>
            <option value={24}>24 hours</option>
            <option value={48}>2 days</option>
            <option value={168}>1 week</option>
          </select>
        </div>

        {/* â”€â”€ Tags â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
            Tags{" "}
            <span className="font-normal text-gray-400">
              {isCatalog ? "(auto-filled from selections, edit if needed)" : "(optional, comma-separated)"}
            </span>
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. anime, action, thriller"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white px-4 py-2.5 text-sm placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          />
        </div>

        {/* â”€â”€ Submit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        >
          {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Postingâ€¦</> : "Post My Dilemma"}
        </button>
      </form>
    </main>
  );
}

export default function CreateAskPage() {
  return (
    <Suspense>
      <CreateAskForm />
    </Suspense>
  );
}
