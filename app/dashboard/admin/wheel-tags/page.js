"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const PAGE_SIZE = 30;

// ── Wheel preview canvas helpers ─────────────────────────────────────────────
const FALLBACK_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function getSegmentText(segment) {
  if (typeof segment === "string") return segment;
  if (segment && typeof segment === "object") {
    if (typeof segment.text === "string") return segment.text;
    if (typeof segment.option === "string") return segment.option;
  }
  return "Option";
}

function getSegmentColor(segment, index, segColors) {
  if (segment && typeof segment === "object") {
    if (typeof segment.color === "string") return segment.color;
    if (segment.style?.backgroundColor) return segment.style.backgroundColor;
  }
  if (segColors?.length > 0) return segColors[index % segColors.length];
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}


function drawWheelPreview(canvas, wheel) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  const size = canvas.width;
  const center = size / 2;
  const radius = size * 0.45;
  const rawSegments = Array.isArray(wheel?.data) && wheel.data.length > 0 ? wheel.data : ["Option"];
  const segments = rawSegments.slice(0, 24);
  const arcSize = (Math.PI * 2) / segments.length;
  const wheelData = wheel?.wheelData || {};
  const segColors = wheelData.segColors || [];

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < segments.length; i++) {
    const start = -Math.PI / 2 + i * arcSize;
    const end = start + arcSize;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, start, end);
    ctx.closePath();
    ctx.fillStyle = getSegmentColor(segments[i], i, segColors);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    const label = getSegmentText(segments[i]).replace(/<[^>]+>/g, "").trim() || "Option";
    const angle = start + arcSize / 2;
    const textRadius = radius * ((wheelData.textDistance || 80) / 100) * 0.85;
    const tx = center + Math.cos(angle) * textRadius;
    const ty = center + Math.sin(angle) * textRadius;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111827";
    ctx.font = `600 11px sans-serif`;
    const short = label.length > 12 ? `${label.slice(0, 10)}..` : label;
    ctx.fillText(short, 0, 0);
    ctx.restore();
  }

  const innerPct = wheelData.innerRadius || 0;
  if (innerPct > 0) {
    const innerPx = radius * (Math.min(innerPct, 60) / 100);
    ctx.beginPath();
    ctx.arc(center, center, innerPx, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (wheelData.centerText) {
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold 14px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wheelData.centerText, center, center);
  }

  ctx.fillStyle = "#334155";
  ctx.font = `500 10px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("spinpapa.com", center, size - 12);
}

async function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Blob creation failed"))),
      "image/webp",
      1.0
    );
  });
}

// ── Tag cleaner (mirrors server-side) ────────────────────────────────────────
const cleanTag = (t) =>
  String(t)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ── Tag chip with optional remove button ─────────────────────────────────────
function TagChip({ tag, onRemove }) {
  // Highlight tags that look malformed (no hyphen, long, likely concatenated)
  const looksOld = tag.length > 12 && !tag.includes("-");
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs rounded-full px-2.5 py-0.5 ${
        looksOld
          ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
          : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
      }`}
    >
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

// ── Individual wheel row ──────────────────────────────────────────────────────
function WheelRow({ doc, onSaved, onGeneratePreview }) {
  const [localTags, setLocalTags] = useState(doc.tags || []);
  const [localPreview, setLocalPreview] = useState(doc.wheelPreview || null);
  const [pendingTags, setPendingTags] = useState(null); // AI-generated, not yet saved
  const [status, setStatus] = useState("idle"); // idle | generating | saving | saved | error
  const [previewStatus, setPreviewStatus] = useState("idle"); // idle | generating | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [newTag, setNewTag] = useState("");
  const [expanded, setExpanded] = useState(false);

  const activeTags = pendingTags ?? localTags;
  const isSparse = localTags.length < 4;

  const generate = async () => {
    setStatus("generating");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/wheel-tags", {
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
      const res = await fetch("/api/admin/wheel-tags", {
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

  const generatePreview = async () => {
    setPreviewStatus("generating");
    try {
      const url = await onGeneratePreview(doc);
      setLocalPreview(url);
      setPreviewStatus("done");
    } catch (err) {
      setPreviewStatus("error");
      setErrorMsg(err.message);
    }
  };

  const removeTag = (tag) => {
    const next = activeTags.filter((t) => t !== tag);
    if (pendingTags !== null) setPendingTags(next);
    else setLocalTags(next);
  };

  const addTag = () => {
    const cleaned = cleanTag(newTag);
    if (!cleaned || activeTags.includes(cleaned)) { setNewTag(""); return; }
    if (pendingTags !== null) setPendingTags([...pendingTags, cleaned]);
    else setLocalTags([...localTags, cleaned]);
    setNewTag("");
  };

  // Detect malformed tags (no hyphens, long concatenated words)
  const hasMalformed = localTags.some((t) => t.length > 12 && !t.includes("-"));

  return (
    <div
      className={`border rounded-xl p-4 transition-colors ${
        isSparse
          ? "border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
      {/* Thumbnail / Preview */}
        {localPreview ? (
          <img
            src={localPreview}
            alt=""
            className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
          />
        ) : (
          <button
            onClick={generatePreview}
            disabled={previewStatus === "generating"}
            title="Generate wheel preview image"
            className={`w-12 h-12 rounded-lg flex-shrink-0 border-2 border-dashed flex flex-col items-center justify-center text-center transition-colors ${
              previewStatus === "generating"
                ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-400"
                : previewStatus === "error"
                ? "border-red-300 bg-red-50 dark:bg-red-900/20 text-red-400"
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:border-indigo-400 hover:text-indigo-500"
            }`}
          >
            {previewStatus === "generating" ? (
              <span className="text-[10px] leading-tight">…</span>
            ) : previewStatus === "error" ? (
              <span className="text-[10px] leading-tight">✗</span>
            ) : (
              <>
                <span className="text-base leading-none">◎</span>
                <span className="text-[8px] leading-tight mt-0.5">Gen</span>
              </>
            )}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
              {doc.title}
            </span>
            {isSparse && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                {localTags.length === 0 ? "No tags" : `${localTags.length} tag${localTags.length === 1 ? "" : "s"}`}
              </span>
            )}
            {hasMalformed && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                Old format
              </span>
            )}
            {pendingTags !== null && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                Unsaved
              </span>
            )}
            {doc.relatedTopics?.length > 0 && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                {[...new Set(doc.relatedTopics.map((t) => t.type))].join(", ")}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
            {doc.description ? doc.description.slice(0, 80) : "No description"}
          </p>
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
              placeholder="Add a tag… (auto-converted to kebab-case)"
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
            <span className="ml-2 text-orange-500 font-medium">· {remaining} still need tags</span>
          )}
          {!isRunning && remaining === 0 && (
            <span className="ml-2 text-emerald-500 font-medium">· All wheels tagged ✓</span>
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
export default function WheelTagManagerPage() {
  const { status, data: session } = useSession();
  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all"); // "all" | "sparse"
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

  // Preview generation
  const hiddenCanvasRef = useRef(null);
  const [previewBatchRunning, setPreviewBatchRunning] = useState(false);

  // ── Fetch wheels ─────────────────────────────────────────────────────────────
  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        filter,
        ...(search ? { q: search } : {}),
      });
      const res = await fetch(`/api/admin/wheel-tags?${params}`, { cache: "no-store" });
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

  const handleSaved = useCallback((id, tags) => {
    setDocs((prev) =>
      prev.map((d) => (String(d._id) === String(id) ? { ...d, tags } : d))
    );
  }, []);

  // ── Preview generation ───────────────────────────────────────────────────────
  // Returns the uploaded preview URL, throws on failure.
  const generatePreview = useCallback(async (wheel) => {
    if (!hiddenCanvasRef.current) throw new Error("Canvas not ready");
    drawWheelPreview(hiddenCanvasRef.current, wheel);
    const blob = await canvasToBlob(hiddenCanvasRef.current);
    const form = new FormData();
    form.append("wheelId", wheel._id);
    form.append("file", new File([blob], `${wheel._id}.webp`, { type: "image/webp" }));
    const res = await fetch("/api/admin/wheel-preview", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Upload failed");
    // Update local docs so the row shows the new preview immediately
    setDocs((prev) =>
      prev.map((d) => String(d._id) === String(wheel._id) ? { ...d, wheelPreview: data.wheelPreview } : d)
    );
    return data.wheelPreview;
  }, []);

  // Generate previews for all wheels on current page that are missing one
  const generateAllPreviews = useCallback(async () => {
    if (previewBatchRunning) return;
    const missing = docs.filter((d) => !d.wheelPreview);
    if (missing.length === 0) return;
    setPreviewBatchRunning(true);
    for (const wheel of missing) {
      try {
        await generatePreview(wheel);
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        // continue with next
      }
    }
    setPreviewBatchRunning(false);
  }, [docs, generatePreview, previewBatchRunning]);

  // ── Batch runner ─────────────────────────────────────────────────────────────
  const runBatch = async (offset = 0) => {
    setBatchRunning(true);
    setBatchDone(0);
    setBatchLog([]);
    setShowBatch(true);
    setBatchOffset(offset);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/admin/wheel-tags/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [], limit: batchSize, offset }),
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

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const sparseCount = docs.filter((d) => !d.tags || d.tags.length < 4).length;

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
      {/* Hidden canvas used for off-screen wheel rendering */}
      <canvas ref={hiddenCanvasRef} width={400} height={400} className="hidden" aria-hidden="true" />

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Wheel Tag Manager</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} system wheels · AI-powered tag generation
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Tags are replaced (not merged) — fixes old concatenated tag format
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Generate missing previews for current page */}
            {docs.some((d) => !d.wheelPreview) && (
              <button
                onClick={generateAllPreviews}
                disabled={previewBatchRunning || batchRunning}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {previewBatchRunning ? "Generating previews…" : "◎ Gen Missing Previews"}
              </button>
            )}
            {/* Batch size selector */}
            <div className="flex items-center gap-1.5">
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
            {[
              { key: "all", label: "All Wheels" },
              { key: "sparse", label: "< 4 Tags" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setFilter(key); setPage(1); }}
                className={`px-4 py-2 font-medium transition-colors ${
                  filter === key
                    ? "bg-indigo-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0">
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by wheel title…"
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
        {filter === "all" && docs.length > 0 && sparseCount > 0 && (
          <p className="text-xs text-orange-600 dark:text-orange-400">
            ⚠ {sparseCount} wheels on this page have fewer than 4 tags
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
            <p className="text-lg">No wheels found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((doc) => (
              <WheelRow key={doc._id} doc={doc} onSaved={handleSaved} onGeneratePreview={generatePreview} />
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
