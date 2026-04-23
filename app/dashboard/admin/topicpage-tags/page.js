"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const PAGE_SIZE = 30;

// ── Helpers ──────────────────────────────────────────────────────────────────
function getTitle(doc) {
  return (
    doc.title?.default ||
    doc.title?.english ||
    doc.title?.romaji ||
    doc.title?.localized ||
    doc.title?.original ||
    doc.slug ||
    "Untitled"
  );
}

function TypeBadge({ type }) {
  const colors = {
    anime: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    movie: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    game: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    character: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    custom: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  };
  return (
    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors[type] || colors.custom}`}>
      {type}
    </span>
  );
}

// ── Tag chip with optional remove button ─────────────────────────────────────
function TagChip({ tag, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded-full px-2.5 py-0.5">
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors leading-none"
          aria-label={`Remove ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

// ── Individual row ────────────────────────────────────────────────────────────
function TopicRow({ doc, onSaved }) {
  const [localTags, setLocalTags] = useState(doc.tags || []);
  const [pendingTags, setPendingTags] = useState(null); // AI-generated, not yet saved
  const [status, setStatus] = useState("idle"); // idle | generating | saving | saved | error
  const [errorMsg, setErrorMsg] = useState("");
  const [newTag, setNewTag] = useState("");
  const [expanded, setExpanded] = useState(false);

  const activeTags = pendingTags ?? localTags;

  const generate = async () => {
    setStatus("generating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/topicpage-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc._id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setPendingTags(data.tags);
      setStatus("idle");
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const save = async (tagsToSave) => {
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/topicpage-tags", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: doc._id, tags: tagsToSave }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setLocalTags(data.tags);
      setPendingTags(null);
      setStatus("saved");
      onSaved(doc._id, data.tags);
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setErrorMsg(err.message);
      setStatus("error");
    }
  };

  const discard = () => {
    setPendingTags(null);
    setStatus("idle");
  };

  const removeTag = (tag) => {
    const next = activeTags.filter((t) => t !== tag);
    if (pendingTags !== null) setPendingTags(next);
    else setLocalTags(next);
  };

  const addTag = () => {
    const cleaned = newTag
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s-]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (!cleaned || activeTags.includes(cleaned)) { setNewTag(""); return; }
    if (pendingTags !== null) setPendingTags([...pendingTags, cleaned]);
    else setLocalTags([...localTags, cleaned]);
    setNewTag("");
  };

  const isEmpty = localTags.length === 0;

  return (
    <div className={`border rounded-xl p-4 transition-colors ${isEmpty ? "border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"}`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        {doc.cover && (
          <img
            src={doc.cover}
            alt=""
            className="w-10 h-14 object-cover rounded flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {getTitle(doc)}
            </span>
            <TypeBadge type={doc.type} />
            {isEmpty && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                No tags
              </span>
            )}
            {pendingTags !== null && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Unsaved
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{doc.slug}</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={generate}
            disabled={status === "generating" || status === "saving"}
            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {status === "generating" ? "Generating…" : "✦ Generate"}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>
      </div>

      {/* Tags preview (always visible, compact) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {activeTags.length > 0 ? (
          activeTags.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              onRemove={expanded ? () => removeTag(tag) : undefined}
            />
          ))
        ) : (
          <span className="text-xs text-gray-400 italic">No tags yet</span>
        )}
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
          {/* Add tag input */}
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add a tag…"
              className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={addTag}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-medium transition-colors"
            >
              Add
            </button>
          </div>

          {/* Save / Discard */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => save(activeTags)}
              disabled={status === "saving"}
              className="text-xs px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold transition-colors"
            >
              {status === "saving" ? "Saving…" : "Save Tags"}
            </button>
            {pendingTags !== null && (
              <button
                onClick={discard}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                Discard
              </button>
            )}
            {status === "saved" && (
              <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>
            )}
            {status === "error" && (
              <span className="text-xs text-red-500">{errorMsg}</span>
            )}
          </div>
        </div>
      )}

      {/* Inline error (when not expanded) */}
      {!expanded && status === "error" && (
        <p className="mt-2 text-xs text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}

// ── Batch progress bar ────────────────────────────────────────────────────────
function BatchProgress({ log, isRunning, done, total, remaining, onStop, onNextBatch }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-900/20 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          {isRunning
            ? `Running… ${done} / ${total}`
            : `Completed — ${done} / ${total} tagged`}
          {!isRunning && remaining != null && remaining > 0 && (
            <span className="ml-2 text-orange-500 font-medium">· {remaining} still untagged</span>
          )}
          {!isRunning && remaining === 0 && (
            <span className="ml-2 text-emerald-500 font-medium">· All pages tagged ✓</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              onClick={onStop}
              className="text-xs px-3 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors"
            >
              Stop
            </button>
          )}
          {!isRunning && onNextBatch && (
            <button
              onClick={onNextBatch}
              className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
            >
              ✦ Run Next Batch →
            </button>
          )}
        </div>
      </div>
      <div className="w-full h-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="h-32 overflow-y-auto space-y-0.5 font-mono text-[11px]">
        {log.map((entry, i) => (
          <div
            key={i}
            className={entry.type === "error" ? "text-red-500" : "text-gray-600 dark:text-gray-400"}
          >
            {entry.type === "error"
              ? `✗ ${entry.title}: ${entry.error}`
              : `✓ ${entry.title} → ${entry.tags?.join(", ")}`}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TopicPageTagManagerPage() {
  const { status, data: session } = useSession();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all"); // "all" | "empty"
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchLog, setBatchLog] = useState([]);
  const [showBatch, setShowBatch] = useState(false);
  const [batchSize, setBatchSize] = useState(25);
  const [batchOffset, setBatchOffset] = useState(0);
  const [batchRemaining, setBatchRemaining] = useState(null);
  const abortRef = useRef(null);

  // ── Fetch pages ─────────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        filter,
        ...(search ? { q: search } : {}),
      });
      const res = await fetch(`/api/admin/topicpage-tags?${params}`, { cache: "no-store" });
      const data = await res.json();
      setDocs(data.docs || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    if (isAdmin) fetchDocs();
  }, [fetchDocs, isAdmin]);

  // ── Handle individual row save (update local state so UI reflects change) ───
  const handleSaved = useCallback((id, tags) => {
    setDocs((prev) =>
      prev.map((d) => (String(d._id) === String(id) ? { ...d, tags } : d))
    );
  }, []);

  // ── Batch: run for a slice of empty-tag pages ────────────────────────────────
  const runBatch = async (offset = 0) => {
    setBatchRunning(true);
    setBatchDone(0);
    setBatchLog([]);
    setShowBatch(true);
    setBatchOffset(offset);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/admin/topicpage-tags/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: [],
          limit: batchSize,
          offset,
        }),
        signal: abort.signal,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "progress" || event.type === "error") {
              setBatchDone(event.done);
              setBatchTotal(event.total);
              setBatchLog((prev) => [...prev, event]);
              if (event.type === "progress") {
                setDocs((prev) =>
                  prev.map((d) =>
                    String(d._id) === event.id ? { ...d, tags: event.tags } : d
                  )
                );
              }
            } else if (event.type === "complete") {
              setBatchDone(event.total);
              setBatchTotal(event.total);
              setBatchRemaining(event.totalRemaining ?? null);
            }
          } catch {
            // ignore malformed lines
          }
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setBatchLog((prev) => [...prev, { type: "error", title: "Batch", error: err.message }]);
      }
    } finally {
      setBatchRunning(false);
      abortRef.current = null;
      fetchDocs();
    }
  };

  const stopBatch = () => {
    abortRef.current?.abort();
    setBatchRunning(false);
  };

  // ── Search submit ────────────────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const emptyCount = docs.filter((d) => !d.tags || d.tags.length === 0).length;

  // ── Auth guard ───────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Access denied.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">TopicPage Tag Manager</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} pages total · AI-powered tag generation
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Batch size selector */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-gray-500 text-xs font-medium">Batch:</span>
              {[25, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setBatchSize(n)}
                  disabled={batchRunning}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    batchSize === n
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={() => runBatch(0)}
              disabled={batchRunning}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-sm"
            >
              {batchRunning ? "Running…" : `✦ Run ${batchSize} (< 4 tags)`}
            </button>
          </div>
        </div>

        {/* ── Batch progress ───────────────────────────────────────────────── */}
        {showBatch && (
          <BatchProgress
            log={batchLog}
            isRunning={batchRunning}
            done={batchDone}
            total={batchTotal}
            remaining={batchRemaining}
            onStop={stopBatch}
            onNextBatch={batchRemaining > 0 ? () => runBatch(batchOffset + batchSize) : null}
          />
        )}

        {/* ── Filters & search ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            {["all", "empty"].map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(1); }}
                className={`px-4 py-2 font-medium transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {f === "all" ? "All Pages" : "No Tags"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title or slug…"
              className="flex-1 text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
                className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* ── Stats bar ───────────────────────────────────────────────────── */}
        {filter === "all" && docs.length > 0 && emptyCount > 0 && (
          <p className="text-xs text-orange-600 dark:text-orange-400">
            ⚠ {emptyCount} pages on this page have no tags
          </p>
        )}

        {/* ── List ────────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">No pages found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <TopicRow key={doc._id} doc={doc} onSaved={handleSaved} />
            ))}
          </div>
        )}

        {/* ── Pagination ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Next →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
