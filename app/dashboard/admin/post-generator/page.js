"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const TYPES = ["all", "anime", "movie", "game", "character"];
const TYPE_COLORS = {
  anime: "bg-pink-500/15 text-pink-600 border-pink-300",
  movie: "bg-blue-500/15 text-blue-600 border-blue-300",
  game: "bg-green-500/15 text-green-600 border-green-300",
  character: "bg-purple-500/15 text-purple-600 border-purple-300",
};

// ─── Stages ────────────────────────────────────────────────────────────────
// "list"     → Browse TopicPages with no posts yet
// "review"   → See AI-generated draft posts, approve/reject each
// "publish"  → Confirmation after publishing

export default function PostGeneratorPage() {
  const { data: session } = useSession();

  const [stage, setStage] = useState("list");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [topics, setTopics] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // Review stage
  const [activeTopic, setActiveTopic] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [rejected, setRejected] = useState(new Set());
  const [expandedResearch, setExpandedResearch] = useState(new Set());

  // Editing a draft inline
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [editBuffer, setEditBuffer] = useState({});

  // Publish stage
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState(null);

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  // ── Fetch topics (stage: list) ────────────────────────────────────────────
  const fetchTopics = useCallback(async (pageNum = 1, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (search) params.set("search", search);
      if (pageNum > 1) params.set("page", String(pageNum));
      const res = await fetch(`/api/admin/post-generator/topics?${params}`);
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      setTopics((prev) => append ? [...prev, ...(data.topics || [])] : (data.topics || []));
      setTotal(data.total || 0);
      setHasMore(data.hasMore || false);
      setPage(pageNum);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [typeFilter, search]);

  // Debounce search input
  const handleSearchInput = (value) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(value.trim()), 350);
  };

  useEffect(() => {
    if (isAdmin) fetchTopics(1, false);
  }, [isAdmin, fetchTopics]);

  // ── Generate drafts for a topic ───────────────────────────────────────────
  const handleGenerate = async (topic) => {
    setActiveTopic(topic);
    setDrafts([]);
    setRejected(new Set());
    setExpandedResearch(new Set());
    setEditingDraftId(null);
    setGenerating(true);
    setStage("review");

    try {
      const res = await fetch("/api/admin/post-generator/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: topic.recommendedCount }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (err) {
      setError(err.message);
      setStage("list");
    } finally {
      setGenerating(false);
    }
  };

  // ── Inline edit helpers ───────────────────────────────────────────────────
  const startEdit = (draft) => {
    setEditingDraftId(draft.draftId);
    setEditBuffer({
      title: draft.title,
      content: draft.content,
      pollOptions: draft.pollOptions.map((o) => o.text),
    });
  };

  const saveEdit = (draftId) => {
    setDrafts((prev) =>
      prev.map((d) =>
        d.draftId !== draftId
          ? d
          : {
              ...d,
              title: editBuffer.title,
              content: editBuffer.content,
              pollOptions: editBuffer.pollOptions
                .filter((t) => t.trim())
                .map((text, i) => ({ tempId: `opt-edited-${i}`, text })),
            }
      )
    );
    setEditingDraftId(null);
  };

  // ── Publish approved drafts ───────────────────────────────────────────────
  const handlePublish = async () => {
    const approved = drafts.filter((d) => !rejected.has(d.draftId));
    if (approved.length === 0) return;

    setPublishing(true);
    try {
      const res = await fetch("/api/admin/post-generator/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: approved }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const data = await res.json();
      setPublishResult(data);
      setStage("publish");
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!session) {
    return <p className="p-8 text-muted-foreground">Loading session...</p>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8 text-red-500 font-bold">
        Access denied. Admin only.
      </div>
    );
  }

  const approvedCount = drafts.filter((d) => !rejected.has(d.draftId)).length;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Post Generator</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate community posts for TopicPages that have no content yet.
          </p>
        </div>
        {stage !== "list" && (
          <button
            onClick={() => { setStage("list"); setDrafts([]); setActiveTopic(null); setPublishResult(null); fetchTopics(1, false); }}
            className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted transition"
          >
            ← Back to Topics
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-400 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STAGE 1: Topic List
         ════════════════════════════════════════════════════════════════════ */}
      {stage === "list" && (
        <div className="space-y-5">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">🔍</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search topics by title or slug…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-primary transition"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${
                  typeFilter === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-muted-foreground text-sm animate-pulse">
              Fetching topics without posts...
            </div>
          ) : topics.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center">
                {search
                  ? `No topics found matching &quot;${search}&quot;.`
                  : "All TopicPages in this category already have posts."}
              </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Showing <span className="font-bold text-foreground">{topics.length}</span> of{" "}
                <span className="font-bold text-foreground">{total}</span> topics with no posts yet
                {search && <> matching <span className="font-semibold">&quot;{search}&quot;</span></>}.
              </p>
              {topics.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  onGenerate={handleGenerate}
                />
              ))}
              {hasMore && (
                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => fetchTopics(page + 1, true)}
                    disabled={loadingMore}
                    className="px-6 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50 transition"
                  >
                    {loadingMore ? "Loading..." : `Load More (${total - topics.length} remaining)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STAGE 2: Review Drafts
         ════════════════════════════════════════════════════════════════════ */}
      {stage === "review" && (
        <div className="space-y-5">
          {/* Topic banner */}
          {activeTopic && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
              {activeTopic.cover && (
                <div className="relative w-14 h-20 shrink-0 rounded-lg overflow-hidden">
                  <Image src={activeTopic.cover} alt={activeTopic.displayTitle} fill className="object-cover" sizes="56px" />
                </div>
              )}
              <div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TYPE_COLORS[activeTopic.type] || "bg-muted"}`}>
                  {activeTopic.type}
                </span>
                <h2 className="font-bold text-lg mt-1">{activeTopic.displayTitle}</h2>
                <p className="text-xs text-muted-foreground">
                  Generating {activeTopic.recommendedCount} posts based on popularity score ({activeTopic.popularityScore} pts)
                </p>
              </div>
            </div>
          )}

          {generating ? (
            <div className="space-y-3">
              {Array.from({ length: activeTopic?.recommendedCount || 3 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse border border-border" />
              ))}
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                Running two-step AI research pipeline... this takes ~30s
              </p>
            </div>
          ) : (
            <>
              {drafts.length > 0 && (
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{approvedCount}</span> of{" "}
                    {drafts.length} posts approved for publishing.
                  </p>
                  <button
                    onClick={handlePublish}
                    disabled={publishing || approvedCount === 0}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-40 transition"
                  >
                    {publishing ? "Publishing..." : `Publish ${approvedCount} Post${approvedCount !== 1 ? "s" : ""}`}
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {drafts.map((draft, idx) => (
                  <DraftCard
                    key={draft.draftId}
                    draft={draft}
                    index={idx}
                    isRejected={rejected.has(draft.draftId)}
                    isEditing={editingDraftId === draft.draftId}
                    editBuffer={editBuffer}
                    isResearchExpanded={expandedResearch.has(draft.draftId)}
                    onToggleReject={() =>
                      setRejected((prev) => {
                        const next = new Set(prev);
                        next.has(draft.draftId) ? next.delete(draft.draftId) : next.add(draft.draftId);
                        return next;
                      })
                    }
                    onStartEdit={() => startEdit(draft)}
                    onSaveEdit={() => saveEdit(draft.draftId)}
                    onCancelEdit={() => setEditingDraftId(null)}
                    onEditBufferChange={setEditBuffer}
                    onToggleResearch={() =>
                      setExpandedResearch((prev) => {
                        const next = new Set(prev);
                        next.has(draft.draftId) ? next.delete(draft.draftId) : next.add(draft.draftId);
                        return next;
                      })
                    }
                  />
                ))}
              </div>

              {drafts.length > 0 && (
                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handlePublish}
                    disabled={publishing || approvedCount === 0}
                    className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-40 transition"
                  >
                    {publishing ? "Publishing..." : `Publish ${approvedCount} Approved Post${approvedCount !== 1 ? "s" : ""}`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STAGE 3: Published confirmation
         ════════════════════════════════════════════════════════════════════ */}
      {stage === "publish" && publishResult && (
        <div className="text-center py-16 space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-2xl font-bold">{publishResult.message}</h2>
          <p className="text-muted-foreground text-sm">
            They are now live in the Global Feed and on the{" "}
            <span className="font-semibold">/{activeTopic?.type}/{activeTopic?.relatedId}</span> topic page.
          </p>
          <div className="flex items-center justify-center gap-3 pt-4">
            <a
              href={`/${activeTopic?.type}/${activeTopic?.relatedId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 rounded-lg border border-border hover:bg-muted transition text-sm font-semibold"
            >
              View Topic Page →
            </a>
            <button
              onClick={() => { setStage("list"); setDrafts([]); setActiveTopic(null); setPublishResult(null); fetchTopics(1, false); }}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition"
            >
              Generate More
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function TopicRow({ topic, onGenerate }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition">
      {topic.cover && (
        <div className="relative w-12 h-16 shrink-0 rounded-lg overflow-hidden">
          <Image src={topic.cover} alt={topic.displayTitle} fill className="object-cover" sizes="48px" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TYPE_COLORS[topic.type] || "bg-muted"}`}>
            {topic.type}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Score: {topic.popularityScore} pts
          </span>
        </div>
        <p className="font-bold text-sm truncate">{topic.displayTitle}</p>
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {topic.description || topic.tags?.join(", ") || "No description"}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">{topic.recommendedCount} posts</span>
        <button
          onClick={async () => { setLoading(true); await onGenerate(topic); setLoading(false); }}
          disabled={loading}
          className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap"
        >
          {loading ? "Generating..." : "✦ Generate"}
        </button>
      </div>
    </div>
  );
}

function DraftCard({
  draft, index, isRejected, isEditing, editBuffer, isResearchExpanded,
  onToggleReject, onStartEdit, onSaveEdit, onCancelEdit, onEditBufferChange, onToggleResearch,
}) {
  return (
    <div className={`rounded-xl border transition ${isRejected ? "border-red-300 bg-red-500/5 opacity-60" : "border-border bg-card"}`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
            Post #{index + 1}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
            {draft.category}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!isRejected && !isEditing && (
            <button
              onClick={onStartEdit}
              className="text-xs px-3 py-1 rounded-lg border border-border hover:bg-muted transition"
            >
              Edit
            </button>
          )}
          <button
            onClick={onToggleReject}
            className={`text-xs px-3 py-1 rounded-lg font-semibold transition ${
              isRejected
                ? "bg-green-500/15 text-green-700 border border-green-300 hover:bg-green-500/25"
                : "bg-red-500/10 text-red-600 border border-red-300 hover:bg-red-500/20"
            }`}
          >
            {isRejected ? "Restore" : "Reject"}
          </button>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground font-semibold">Title</label>
              <input
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
                value={editBuffer.title || ""}
                onChange={(e) => onEditBufferChange((b) => ({ ...b, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold">Content</label>
              <textarea
                rows={3}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary resize-none"
                value={editBuffer.content || ""}
                onChange={(e) => onEditBufferChange((b) => ({ ...b, content: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-semibold">Poll Options (one per line)</label>
              <textarea
                rows={(editBuffer.pollOptions || []).length + 1}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:border-primary resize-none font-mono"
                value={(editBuffer.pollOptions || []).join("\n")}
                onChange={(e) =>
                  onEditBufferChange((b) => ({ ...b, pollOptions: e.target.value.split("\n") }))
                }
              />
            </div>
            <div className="flex gap-2">
              <button onClick={onSaveEdit} className="px-4 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90">Save</button>
              <button onClick={onCancelEdit} className="px-4 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-bold text-foreground">{draft.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{draft.content}</p>
            {/* Poll preview */}
            <div className="space-y-1.5 pt-1">
              {draft.pollOptions.map((opt, i) => (
                <div key={opt.tempId || i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/60 text-sm">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center">
                    {i + 1}
                  </span>
                  {opt.text}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Research context toggle */}
        <button
          onClick={onToggleResearch}
          className="text-[11px] text-muted-foreground hover:text-foreground transition flex items-center gap-1 pt-1"
        >
          {isResearchExpanded ? "▲" : "▼"} {isResearchExpanded ? "Hide" : "Show"} AI research context
        </button>
        {isResearchExpanded && (
          <div className="px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-bold block mb-1">What the AI was told:</span>
            {draft.researchContext}
          </div>
        )}
      </div>
    </div>
  );
}
