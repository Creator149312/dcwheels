"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Discover → dedupe → generate drafts → edit slug/title → publish.
//
// Drafts live in component state only (persisted to localStorage so a tab
// refresh doesn't lose in-flight work). No schema changes to Wheel/Page.
// ---------------------------------------------------------------------------

const CONCURRENCY = 4;
const LS_DRAFTS_KEY = "SpinpapaDiscoveryDrafts";

const cleanTag = (tag) =>
  tag.replace(/[^a-zA-Z0-9]/g, "").trim().toLowerCase();

const isValidSlug = (s) =>
  typeof s === "string" &&
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) &&
  s.length <= 80;

// Promise pool — at most `limit` workers in flight.
async function runPool(items, limit, worker) {
  let cursor = 0;
  const results = new Array(items.length);
  const runOne = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { error: err };
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, runOne)
  );
  return results;
}

export default function DiscoverPage() {
  const [prompt, setPrompt] = useState("");
  const [context, setContext] = useState("");
  const [template, setTemplate] = useState("Picker Wheel");
  const [limit, setLimit] = useState(20);
  const [source, setSource] = useState("ai"); // "ai" | "wikipedia" | "both"

  const [stage, setStage] = useState("idle"); // idle|discovering|review|generating|drafts
  const [topMessage, setTopMessage] = useState("");
  const [topic, setTopic] = useState(null);

  // Stage 1/2 output: candidates with {entity, wheelTitle, slug, source, exists, picked}
  const [candidates, setCandidates] = useState([]);

  // Stage 3/4: drafts keyed by slug (mutable as user edits)
  // Each: { origSlug, slug, title, description, tags, content, segments, status,
  //         error, publishedSlug, slugCheck: {checking, taken, existingTitle} }
  const [drafts, setDrafts] = useState([]);
  const draftsRef = useRef([]);

  // Hydrate drafts from localStorage once on mount so a tab refresh doesn't
  // nuke in-flight reviewer state.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_DRAFTS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          draftsRef.current = parsed;
          setDrafts(parsed);
          setStage("drafts");
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

  const patchDraft = useCallback((i, patch) => {
    draftsRef.current[i] = { ...draftsRef.current[i], ...patch };
    setDrafts([...draftsRef.current]);
  }, []);

  // ───────────────────────────────────── Stage 1+2: discover + dedupe
  const runDiscover = async () => {
    if (!prompt.trim()) return;
    setStage("discovering");
    setTopMessage("");
    setCandidates([]);
    setTopic(null);
    try {
      const res = await fetch("/api/discoverWheels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, context, limit, template, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Discover failed");
      setTopic(data.topic || null);
      const picked = (data.candidates || []).map((c) => ({
        ...c,
        picked: !c.exists, // default: auto-select only new candidates
      }));
      setCandidates(picked);
      setStage("review");
      if (!picked.length) setTopMessage("No candidates returned.");
    } catch (err) {
      setTopMessage("❌ " + (err?.message || "Discover failed"));
      setStage("idle");
    }
  };

  const togglePick = (i) =>
    setCandidates((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, picked: !c.picked } : c))
    );

  const selectAll = (picked) =>
    setCandidates((prev) =>
      prev.map((c) => ({ ...c, picked: c.exists ? false : picked }))
    );

  const pickedCandidates = useMemo(
    () => candidates.filter((c) => c.picked && !c.exists),
    [candidates]
  );

  // ───────────────────────────────────── Stage 3: generate drafts
  const runGenerate = async () => {
    if (!pickedCandidates.length) return;
    setStage("generating");
    setTopMessage("");

    // Seed placeholder drafts so the UI can show per-row status immediately.
    const seeded = pickedCandidates.map((c) => ({
      origSlug: c.slug,
      slug: c.slug,
      title: c.wheelTitle,
      entity: c.entity,
      source: c.source,
      description: "",
      tags: [],
      content: [],
      segments: [],
      status: "queued", // queued|generating|ready|publishing|published|error
      error: null,
      publishedSlug: null,
      slugCheck: { checking: false, taken: false, existingTitle: null },
    }));
    draftsRef.current = seeded;
    setDrafts(seeded);

    await runPool(seeded, CONCURRENCY, async (row, i) => {
      patchDraft(i, { status: "generating" });
      try {
        const res = await fetch("/api/createFromPrompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: row.title, context }),
        });
        const data = await res.json();
        if (!res.ok || !data?.json) {
          throw new Error(data?.message || "Generate failed");
        }
        const top = Object.keys(data.json)[0];
        const wd = data.json[top] || {};
        if (
          !wd.title ||
          !wd.description ||
          !Array.isArray(wd.segments) ||
          !Array.isArray(wd.tags) ||
          !Array.isArray(wd.content)
        ) {
          throw new Error("AI returned incomplete JSON");
        }
        const cleanedTags = Array.from(
          new Set((wd.tags || []).map(cleanTag).filter(Boolean))
        );
        patchDraft(i, {
          status: "ready",
          title: wd.title,
          description: wd.description,
          tags: cleanedTags,
          content: wd.content,
          segments: wd.segments,
        });
      } catch (err) {
        patchDraft(i, { status: "error", error: err?.message || String(err) });
      }
    });

    setStage("drafts");
  };

  // ───────────────────────────────────── Stage 4 helpers: slug live-check
  const slugCheckTimers = useRef({});
  const scheduleSlugCheck = (i, slug) => {
    if (slugCheckTimers.current[i]) clearTimeout(slugCheckTimers.current[i]);
    // Short-circuit when format is already invalid — no need to ping server.
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
        // Only apply if the slug hasn't changed while the request was in
        // flight (stale-response guard).
        if (draftsRef.current[i]?.slug !== slug) return;
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

  const editSlug = (i, value) => {
    const next = value.toLowerCase().replace(/\s+/g, "-");
    patchDraft(i, { slug: next });
    scheduleSlugCheck(i, next);
  };

  const editTitle = (i, value) => patchDraft(i, { title: value });

  // ───────────────────────────────────── Stage 4: publish
  const publishOne = async (i) => {
    const row = draftsRef.current[i];
    if (!row || row.status === "publishing" || row.status === "published") return;
    if (!isValidSlug(row.slug)) {
      patchDraft(i, { error: "Invalid slug format" });
      return;
    }
    if (row.slugCheck?.taken) {
      patchDraft(i, { error: "Slug already in use — edit and retry" });
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
            segments: row.segments,
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

  const publishAll = async () => {
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
    setStage("idle");
  };

  // ───────────────────────────────────── Render
  const summary = useMemo(() => {
    const done = drafts.filter((d) => d.status === "published").length;
    const ready = drafts.filter((d) => d.status === "ready").length;
    const err = drafts.filter((d) => d.status === "error").length;
    return { done, ready, err, total: drafts.length };
  }, [drafts]);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Discover Wheels</h1>

      {/* Stage 1 input */}
      <div className="bg-gray-50 border rounded p-4 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Topic prompt</label>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full border rounded p-2"
              placeholder='e.g. "Dota 2"'
              disabled={stage === "discovering" || stage === "generating"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Context (optional)</label>
            <input
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="w-full border rounded p-2"
              placeholder='e.g. "picking a hero to play"'
              disabled={stage === "discovering" || stage === "generating"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Title template</label>
            <input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Picker Wheel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Max candidates</label>
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 20)}
              className="w-full border rounded p-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Source</label>
          <div className="flex flex-wrap gap-3 text-sm">
            {[
              { v: "ai", label: "AI (generic angles)" },
              { v: "wikipedia", label: "Wikipedia (specific entities)" },
              { v: "both", label: "Both" },
            ].map((opt) => (
              <label key={opt.v} className="inline-flex items-center gap-1">
                <input
                  type="radio"
                  name="discover-source"
                  value={opt.v}
                  checked={source === opt.v}
                  onChange={() => setSource(opt.v)}
                  disabled={stage === "discovering" || stage === "generating"}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <button
          onClick={runDiscover}
          disabled={!prompt.trim() || stage === "discovering" || stage === "generating"}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {stage === "discovering" ? "Discovering..." : "1. Discover candidates"}
        </button>
        {topMessage && <p className="text-sm">{topMessage}</p>}
        {topic && (
          <p className="text-sm text-gray-600">
            Wikipedia topic: <span className="font-medium">{topic}</span>
          </p>
        )}
      </div>

      {/* Gate #1: pick candidates */}
      {candidates.length > 0 && (
        <div className="bg-white border rounded">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="font-medium">
              Gate #1 — choose which to generate
              <span className="ml-2 text-sm text-gray-500">
                ({pickedCandidates.length}/{candidates.length} selected)
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => selectAll(true)}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
              >
                Select new
              </button>
              <button
                onClick={() => selectAll(false)}
                className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
              >
                Clear
              </button>
              <button
                onClick={runGenerate}
                disabled={!pickedCandidates.length || stage === "generating"}
                className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm disabled:opacity-50"
              >
                {stage === "generating"
                  ? "Generating..."
                  : `2. Generate ${pickedCandidates.length} draft${pickedCandidates.length === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={c.slug + i} className="border-t">
                    <td className="p-2 w-8">
                      <input
                        type="checkbox"
                        checked={!!c.picked}
                        disabled={c.exists}
                        onChange={() => togglePick(i)}
                      />
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{c.wheelTitle}</div>
                      <div className="text-xs text-gray-500">
                        /{c.slug} · {c.source}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      {c.exists ? (
                        <a
                          href={`/wheel/${c.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-700 underline"
                        >
                          exists
                        </a>
                      ) : (
                        <span className="text-xs text-green-700">new</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gate #2: draft review */}
      {drafts.length > 0 && (
        <div className="bg-white border rounded">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <div className="font-medium">
              Gate #2 — review, edit slug/title, then publish
              <span className="ml-2 text-sm text-gray-500">
                {summary.done}/{summary.total} published · {summary.ready} ready · {summary.err} failed
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={publishAll}
                disabled={!summary.ready}
                className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 text-sm disabled:opacity-50"
              >
                Publish all ready ({summary.ready})
              </button>
              <button
                onClick={clearDrafts}
                className="px-3 py-1 rounded border text-sm hover:bg-gray-100"
              >
                Clear all
              </button>
            </div>
          </div>
          <div>
            {drafts.map((d, i) => (
              <DraftRow
                key={d.origSlug + i}
                draft={d}
                index={i}
                onEditTitle={editTitle}
                onEditSlug={editSlug}
                onPublish={publishOne}
                onRemove={removeDraft}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DraftRow({ draft, index, onEditTitle, onEditSlug, onPublish, onRemove }) {
  const slugValid = isValidSlug(draft.slug);
  const slugTaken = draft.slugCheck?.taken;
  const canPublish =
    draft.status === "ready" && slugValid && !slugTaken && !draft.slugCheck?.checking;

  return (
    <div className="border-t p-3 space-y-2">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <label className="block text-xs text-gray-500">Title</label>
            <input
              value={draft.title}
              onChange={(e) => onEditTitle(index, e.target.value)}
              className="w-full border rounded p-1 text-sm"
              disabled={draft.status === "publishing" || draft.status === "published"}
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
                disabled={draft.status === "publishing" || draft.status === "published"}
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
                <span className="text-xs text-red-600">invalid format</span>
              )}
            </div>
          </div>
          {draft.segments?.length > 0 && (
            <div className="text-xs text-gray-600">
              <span className="font-medium">{draft.segments.length} segments:</span>{" "}
              {draft.segments.slice(0, 6).join(", ")}
              {draft.segments.length > 6 && "…"}
            </div>
          )}
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
                disabled={!canPublish}
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
    queued: "bg-gray-200 text-gray-700",
    generating: "bg-blue-100 text-blue-700",
    ready: "bg-emerald-100 text-emerald-700",
    publishing: "bg-indigo-100 text-indigo-700",
    published: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${map[status] || ""}`}>
      {status}
    </span>
  );
}
