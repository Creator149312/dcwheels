"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Bulk wheel creator for catalog sources (TMDB today; RAWG/AniList next).
//
// Flow:
//   1. Pick preset (+ optional genre/decade)                  [no AI]
//   2. Fetch segments from TMDB, preview, (Gate #1)           [no AI]
//   3. Generate page copy via /api/createFromCatalog           [1 AI call]
//   4. Review title/slug/segments, (Gate #2) → Publish         [no AI]
//
// Most of the speed comes from step 2 using real TMDB data instead of asking
// AI to invent movie titles (which hallucinates and is slow).
// ---------------------------------------------------------------------------

const LS_DRAFTS_KEY = "SpinpapaCatalogDrafts";
const CONCURRENCY = 3;

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");

const isValidSlug = (s) =>
  typeof s === "string" &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) &&
  s.length <= 80;

async function runPool(items, limit, worker) {
  let cursor = 0;
  const runOne = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        await worker(items[i], i);
      } catch {
        /* row marks its own error */
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runOne)
  );
}

export default function CatalogPage() {
  // Preset catalog (loaded once)
  const [presetCatalog, setPresetCatalog] = useState({
    presets: [],
    genres: [],
    decades: [],
  });

  // Form state
  const [presetKey, setPresetKey] = useState("popular");
  const [genre, setGenre] = useState("");
  const [decade, setDecade] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [customTitle, setCustomTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  // Stage state
  const [stage, setStage] = useState("idle"); // idle|fetching|previewing|generating|drafts
  const [topMessage, setTopMessage] = useState("");

  // Stage 2 output: fetched segments (checkboxes decide what goes into draft)
  const [fetched, setFetched] = useState({
    segments: [],
    titleHint: "",
    preset: null,
    genre: null,
    decade: null,
  });
  const [picked, setPicked] = useState({}); // { [index]: true }

  // Stage 3+4: drafts (usually just one per generation)
  const [drafts, setDrafts] = useState([]);
  const draftsRef = useRef([]);

  // Hydrate drafts from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_DRAFTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          draftsRef.current = parsed;
          setDrafts(parsed);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (drafts.length) {
        window.localStorage.setItem(LS_DRAFTS_KEY, JSON.stringify(drafts));
      } else {
        window.localStorage.removeItem(LS_DRAFTS_KEY);
      }
    } catch {}
  }, [drafts]);

  // Load preset catalog on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tmdb/presets");
        if (!res.ok) return;
        const data = await res.json();
        setPresetCatalog(data);
      } catch {}
    })();
  }, []);

  const currentPreset = useMemo(
    () => presetCatalog.presets.find((p) => p.key === presetKey) || null,
    [presetCatalog.presets, presetKey]
  );

  // Auto-update slug when the title hint changes (unless user manually edited)
  useEffect(() => {
    if (slugEdited) return;
    const t = customTitle || fetched.titleHint || "";
    if (t) setCustomSlug(slugify(t));
  }, [customTitle, fetched.titleHint, slugEdited]);

  // Auto-fill title from fetched hint once (preserving any manual edit)
  useEffect(() => {
    if (fetched.titleHint && !customTitle) setCustomTitle(fetched.titleHint);
  }, [fetched.titleHint]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchDraft = useCallback((i, patch) => {
    draftsRef.current[i] = { ...draftsRef.current[i], ...patch };
    setDrafts([...draftsRef.current]);
  }, []);

  // ───────────────────────────────────── Stage 2: fetch catalog
  const runFetch = async () => {
    setStage("fetching");
    setTopMessage("");
    try {
      const res = await fetch("/api/tmdb/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset: presetKey,
          genre: genre || undefined,
          decade: decade || undefined,
          page,
          limit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Fetch failed");
      setFetched({
        segments: data.segments || [],
        titleHint: data.titleHint || "",
        preset: data.preset,
        genre: data.genre,
        decade: data.decade,
      });
      // Default: pre-select everything
      const pre = {};
      (data.segments || []).forEach((_, i) => (pre[i] = true));
      setPicked(pre);
      setCustomTitle(data.titleHint || "");
      setSlugEdited(false); // trigger re-slugify from new title
      setStage("previewing");
    } catch (err) {
      setTopMessage("❌ " + (err?.message || "Fetch failed"));
      setStage("idle");
    }
  };

  const togglePick = (i) =>
    setPicked((prev) => ({ ...prev, [i]: !prev[i] }));

  const selectAllPicked = (v) => {
    const next = {};
    fetched.segments.forEach((_, i) => (next[i] = v));
    setPicked(next);
  };

  const pickedSegments = useMemo(
    () => fetched.segments.filter((_, i) => picked[i]),
    [fetched.segments, picked]
  );

  // ───────────────────────────────────── Stage 3: generate draft
  const runGenerate = async () => {
    if (!customTitle.trim()) {
      setTopMessage("Give the wheel a title.");
      return;
    }
    if (!pickedSegments.length) {
      setTopMessage("Pick at least one segment.");
      return;
    }
    if (!isValidSlug(customSlug)) {
      setTopMessage("Slug format is invalid.");
      return;
    }

    setStage("generating");
    setTopMessage("");

    const draft = {
      title: customTitle.trim(),
      slug: customSlug,
      entityType: "movie",
      segments: pickedSegments,
      description: "",
      tags: [],
      content: [],
      status: "generating",
      error: null,
      publishedSlug: null,
      slugCheck: { checking: false, taken: false, existingTitle: null },
    };
    draftsRef.current = [...draftsRef.current, draft];
    setDrafts([...draftsRef.current]);
    const draftIndex = draftsRef.current.length - 1;

    try {
      const res = await fetch("/api/createFromCatalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          segments: draft.segments,
          entityType: "movie",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.json?.data) {
        throw new Error(data?.message || "Generate failed");
      }
      const jd = data.json.data;
      patchDraft(draftIndex, {
        status: "ready",
        description: jd.description,
        tags: jd.tags,
        content: jd.content,
        segments: jd.segments,
      });
      // Initial slug availability check
      scheduleSlugCheck(draftIndex, draft.slug);
    } catch (err) {
      patchDraft(draftIndex, {
        status: "error",
        error: err?.message || String(err),
      });
    }
    setStage("drafts");
  };

  // ───────────────────────────────────── Slug live-check (debounced)
  const slugCheckTimers = useRef({});
  const scheduleSlugCheck = (i, slug) => {
    if (slugCheckTimers.current[i]) clearTimeout(slugCheckTimers.current[i]);
    if (!isValidSlug(slug)) {
      patchDraft(i, {
        slugCheck: { checking: false, taken: false, existingTitle: null },
      });
      return;
    }
    patchDraft(i, {
      slugCheck: { checking: true, taken: false, existingTitle: null },
    });
    slugCheckTimers.current[i] = setTimeout(async () => {
      try {
        const res = await fetch("/api/checkSlug", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        const data = await res.json();
        if (draftsRef.current[i]?.slug !== slug) return; // stale
        patchDraft(i, {
          slugCheck: {
            checking: false,
            taken: !!data.exists,
            existingTitle: data.existingTitle || null,
          },
        });
      } catch {
        patchDraft(i, {
          slugCheck: { checking: false, taken: false, existingTitle: null },
        });
      }
    }, 300);
  };

  const editDraftTitle = (i, v) => patchDraft(i, { title: v });
  const editDraftSlug = (i, v) => {
    const next = v.toLowerCase().replace(/\s+/g, "-");
    patchDraft(i, { slug: next });
    scheduleSlugCheck(i, next);
  };
  const toggleSegment = (draftIndex, segIndex) => {
    const row = draftsRef.current[draftIndex];
    const next = [...row.segments];
    next[segIndex] = {
      ...next[segIndex],
      visible: next[segIndex].visible === false ? true : false,
    };
    patchDraft(draftIndex, { segments: next });
  };

  // ───────────────────────────────────── Stage 4: publish
  const publishOne = async (i) => {
    const row = draftsRef.current[i];
    if (!row || row.status === "publishing" || row.status === "published") return;
    if (!isValidSlug(row.slug)) {
      patchDraft(i, { error: "Invalid slug format" });
      return;
    }
    if (row.slugCheck?.taken) {
      patchDraft(i, { error: "Slug already in use — pick another" });
      return;
    }

    patchDraft(i, { status: "publishing", error: null });
    try {
      const res = await fetch("/api/createFromJSON", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonKey: row.slug.replace(/-/g, "_"),
          jsonData: {
            title: row.title,
            description: row.description,
            tags: row.tags,
            content: row.content,
            segments: row.segments.filter((s) => s.visible !== false),
          },
          slug: row.slug,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        patchDraft(i, {
          status: "ready",
          error: "Slug taken — pick another",
          slugCheck: { checking: false, taken: true, existingTitle: null },
        });
        return;
      }
      if (res.status !== 201) {
        throw new Error(data?.message || "Publish failed");
      }
      patchDraft(i, { status: "published", publishedSlug: data.slug });
    } catch (err) {
      patchDraft(i, { status: "error", error: err?.message || String(err) });
    }
  };

  const publishAllReady = async () => {
    const indexes = draftsRef.current
      .map((r, i) => (r.status === "ready" ? i : -1))
      .filter((i) => i >= 0);
    await runPool(indexes, CONCURRENCY, (i) => publishOne(i));
  };

  const removeDraft = (i) => {
    draftsRef.current = draftsRef.current.filter((_, idx) => idx !== i);
    setDrafts([...draftsRef.current]);
  };

  const clearDrafts = () => {
    draftsRef.current = [];
    setDrafts([]);
  };

  const summary = useMemo(() => {
    const done = drafts.filter((d) => d.status === "published").length;
    const ready = drafts.filter((d) => d.status === "ready").length;
    const err = drafts.filter((d) => d.status === "error").length;
    return { done, ready, err, total: drafts.length };
  }, [drafts]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Create from Catalog</h1>
      <p className="text-center text-sm text-gray-600">
        Bulk-create wheels from TMDB. Posters &amp; deep-links included. AI is used only for the page description.
      </p>

      {/* Stage 1 form */}
      <div className="bg-gray-50 border rounded p-4 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Preset</label>
            <select
              value={presetKey}
              onChange={(e) => setPresetKey(e.target.value)}
              className="w-full border rounded p-2"
              disabled={stage === "fetching" || stage === "generating"}
            >
              {presetCatalog.presets.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Page</label>
            <input
              type="number"
              min={1}
              max={20}
              value={page}
              onChange={(e) => setPage(Number(e.target.value) || 1)}
              className="w-full border rounded p-2"
            />
          </div>
          {currentPreset?.supports?.includes("genre") && (
            <div>
              <label className="block text-sm font-medium">Genre</label>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="">— Any —</option>
                {presetCatalog.genres.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {currentPreset?.supports?.includes("decade") && (
            <div>
              <label className="block text-sm font-medium">Decade</label>
              <select
                value={decade}
                onChange={(e) => setDecade(e.target.value)}
                className="w-full border rounded p-2"
              >
                <option value="">— Any —</option>
                {presetCatalog.decades.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium">
              Max segments (1-40)
            </label>
            <input
              type="number"
              min={1}
              max={40}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 20)}
              className="w-full border rounded p-2"
            />
          </div>
        </div>
        <button
          onClick={runFetch}
          disabled={stage === "fetching" || stage === "generating"}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {stage === "fetching" ? "Fetching..." : "1. Fetch from TMDB"}
        </button>
        {topMessage && <p className="text-sm mt-2">{topMessage}</p>}
      </div>

      {/* Stage 2 preview */}
      {fetched.segments.length > 0 && (
        <div className="bg-white border rounded">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-b bg-gray-50">
            <div>
              <div className="font-medium">
                Gate #1 — choose segments for your wheel
              </div>
              <div className="text-xs text-gray-500">
                {pickedSegments.length}/{fetched.segments.length} picked
                {fetched.genre ? ` · ${fetched.genre}` : ""}
                {fetched.decade ? ` · ${fetched.decade}` : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAllPicked(true)}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
              >
                Select all
              </button>
              <button
                onClick={() => selectAllPicked(false)}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 p-3 max-h-96 overflow-y-auto">
            {fetched.segments.map((s, i) => (
              <label
                key={s.entityId || i}
                className={`cursor-pointer border rounded overflow-hidden text-xs ${
                  picked[i] ? "ring-2 ring-blue-500" : "opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={!!picked[i]}
                  onChange={() => togglePick(i)}
                />
                {s.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.image}
                    alt={s.text}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-1 truncate" title={s.text}>
                  {s.text}
                  {s.meta?.year && (
                    <span className="text-gray-500"> · {s.meta.year}</span>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 border-t bg-gray-50 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium">Wheel title</label>
                <input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full border rounded p-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">/wheel/</span>
                  <input
                    value={customSlug}
                    onChange={(e) => {
                      setSlugEdited(true);
                      setCustomSlug(
                        e.target.value.toLowerCase().replace(/\s+/g, "-")
                      );
                    }}
                    className={`flex-1 border rounded p-1 text-sm font-mono ${
                      isValidSlug(customSlug)
                        ? "border-gray-300"
                        : "border-red-400"
                    }`}
                  />
                </div>
              </div>
            </div>
            <button
              onClick={runGenerate}
              disabled={
                !pickedSegments.length ||
                stage === "generating" ||
                !customTitle.trim()
              }
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm disabled:opacity-50"
            >
              {stage === "generating"
                ? "Generating..."
                : `2. Generate draft with ${pickedSegments.length} segments`}
            </button>
          </div>
        </div>
      )}

      {/* Stage 4 drafts review */}
      {drafts.length > 0 && (
        <div className="bg-white border rounded">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="font-medium">
              Gate #2 — review and publish
              <span className="ml-2 text-sm text-gray-500">
                {summary.done}/{summary.total} published · {summary.ready} ready
                · {summary.err} failed
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={publishAllReady}
                disabled={!summary.ready}
                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
              >
                Publish all ready ({summary.ready})
              </button>
              <button
                onClick={clearDrafts}
                className="px-3 py-1 rounded border text-sm hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
          </div>
          {drafts.map((d, i) => (
            <DraftRow
              key={i}
              draft={d}
              index={i}
              onEditTitle={editDraftTitle}
              onEditSlug={editDraftSlug}
              onToggleSegment={toggleSegment}
              onPublish={publishOne}
              onRemove={removeDraft}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftRow({
  draft,
  index,
  onEditTitle,
  onEditSlug,
  onToggleSegment,
  onPublish,
  onRemove,
}) {
  const slugValid = isValidSlug(draft.slug);
  const slugTaken = draft.slugCheck?.taken;
  const canPublish =
    draft.status === "ready" &&
    slugValid &&
    !slugTaken &&
    !draft.slugCheck?.checking;
  const visibleCount = (draft.segments || []).filter(
    (s) => s.visible !== false
  ).length;

  return (
    <div className="border-t p-3 space-y-3">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <label className="block text-xs text-gray-500">Title</label>
            <input
              value={draft.title}
              onChange={(e) => onEditTitle(index, e.target.value)}
              className="w-full border rounded p-1 text-sm"
              disabled={
                draft.status === "publishing" || draft.status === "published"
              }
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Slug</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">/wheel/</span>
              <input
                value={draft.slug}
                onChange={(e) => onEditSlug(index, e.target.value)}
                className={`flex-1 border rounded p-1 text-sm font-mono ${
                  !slugValid || slugTaken ? "border-red-400" : "border-gray-300"
                }`}
                disabled={
                  draft.status === "publishing" || draft.status === "published"
                }
              />
              {draft.slugCheck?.checking && (
                <span className="text-xs text-gray-500">checking…</span>
              )}
              {!draft.slugCheck?.checking && slugTaken && (
                <span className="text-xs text-red-600">⚠ taken</span>
              )}
              {!draft.slugCheck?.checking && slugValid && !slugTaken && (
                <span className="text-xs text-green-600">✓ available</span>
              )}
              {!slugValid && (
                <span className="text-xs text-red-600">invalid</span>
              )}
            </div>
          </div>
          {draft.description && (
            <div>
              <label className="block text-xs text-gray-500">Description</label>
              <div className="text-xs text-gray-700 italic">
                {draft.description}
              </div>
            </div>
          )}
          {draft.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {draft.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
          <div className="text-xs text-gray-600">
            <span className="font-medium">
              {visibleCount}/{draft.segments?.length || 0} segments
            </span>{" "}
            (click to exclude)
          </div>
          <div className="flex flex-wrap gap-1">
            {(draft.segments || []).map((s, si) => (
              <button
                key={(s.entityId || si) + "-" + si}
                onClick={() => onToggleSegment(index, si)}
                disabled={
                  draft.status === "publishing" ||
                  draft.status === "published"
                }
                className={`text-xs px-1.5 py-0.5 rounded border ${
                  s.visible === false
                    ? "bg-red-50 text-red-500 line-through border-red-200"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
                title={s.text}
              >
                {s.text.length > 24 ? s.text.slice(0, 22) + "…" : s.text}
              </button>
            ))}
          </div>
          {draft.error && (
            <div className="text-xs text-red-600">{draft.error}</div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 min-w-[140px]">
          <StatusBadge status={draft.status} />
          {draft.status === "published" && draft.publishedSlug && (
            <a
              href={`/wheel/${draft.publishedSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 underline"
            >
              /wheel/{draft.publishedSlug}
            </a>
          )}
          {draft.status !== "published" && (
            <div className="flex gap-1">
              <button
                onClick={() => onPublish(index)}
                disabled={!canPublish || visibleCount === 0}
                className="text-xs px-2 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-40"
              >
                Publish
              </button>
              <button
                onClick={() => onRemove(index)}
                className="text-xs px-2 py-1 rounded border hover:bg-gray-100"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    generating: "bg-blue-100 text-blue-700",
    ready: "bg-emerald-100 text-emerald-700",
    publishing: "bg-indigo-100 text-indigo-700",
    published: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs ${
        map[status] || ""
      }`}
    >
      {status}
    </span>
  );
}
