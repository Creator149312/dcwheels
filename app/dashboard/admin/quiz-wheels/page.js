"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Brain, Plus, Trash2, ExternalLink,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";
const OPTION_LABELS = ["A", "B", "C", "D"];

// ── Default blank segment ─────────────────────────────────────────────────────
const blankSegment = () => ({
  text: "",
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  weight: 1,
  visible: true,
});

// ── Single question card in the form ─────────────────────────────────────────
function QuestionCard({ seg, idx, onChange, onRemove }) {
  const update = (field, val) => onChange(idx, field, val);
  const updateOption = (optIdx, val) => {
    const next = [...(seg.options || ["", "", "", ""])];
    next[optIdx] = val;
    onChange(idx, "options", next);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3 relative">
      <button
        type="button"
        onClick={() => onRemove(idx)}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
        aria-label="Remove question"
      >
        <Trash2 size={12} />
      </button>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Question {idx + 1}
      </p>

      {/* Wheel label */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Wheel Label (short, appears on the slice)
        </label>
        <input
          value={seg.text}
          onChange={(e) => update("text", e.target.value)}
          placeholder="e.g. Geography"
          className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Question */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1">
          Full Question
        </label>
        <textarea
          value={seg.question}
          onChange={(e) => update("question", e.target.value)}
          placeholder="Enter the question the player has to answer…"
          rows={2}
          className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      {/* Options */}
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-2">
          Answer Options — click the correct one
        </label>
        <div className="space-y-2">
          {(seg.options || ["", "", "", ""]).slice(0, 4).map((opt, optIdx) => (
            <label
              key={optIdx}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                seg.correctIndex === optIdx
                  ? "border-green-500 bg-green-50 dark:bg-green-950/40"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name={`correct-${idx}`}
                checked={seg.correctIndex === optIdx}
                onChange={() => update("correctIndex", optIdx)}
                className="accent-green-500 flex-shrink-0"
              />
              <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">
                {OPTION_LABELS[optIdx]}
              </span>
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(optIdx, e.target.value)}
                placeholder={`Option ${OPTION_LABELS[optIdx]}`}
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {seg.correctIndex === optIdx && (
                <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />
              )}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Existing quiz row in the list ─────────────────────────────────────────────
function QuizRow({ wheel, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${wheel.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/quiz-wheels?id=${wheel._id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      onDeleted(wheel._id);
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            {wheel.title}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 uppercase tracking-wide">
            {wheel.data?.length ?? 0} questions
          </span>
          {wheel.page?.indexed && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
              Indexed
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {wheel.page?.slug ? `/wheels/${wheel.page.slug}` : "No page linked"}
        </p>
        {wheel.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {wheel.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {wheel.page?.slug && (
          <Link
            href={`/wheels/${wheel.page.slug}`}
            target="_blank"
            className="text-xs px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
            title="Open page"
          >
            <ExternalLink size={11} />
          </Link>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors disabled:opacity-50"
          title="Delete"
        >
          {deleting ? <Loader2 className="animate-spin" size={11} /> : <Trash2 size={11} />}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminQuizWheelsPage() {
  const { data: session, status } = useSession();
  const isAdmin =
    status === "authenticated" &&
    (session?.user?.role === "admin" || session?.user?.email === ADMIN_EMAIL);

  const [wheels, setWheels] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [tags, setTags] = useState("");
  const [segments, setSegments] = useState([blankSegment()]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedSlug, setSavedSlug] = useState(null);

  // Auto-derive slug from title unless the user has typed one manually
  useEffect(() => {
    if (!slugManual) {
      setSlug(
        title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .replace(/(^-|-$)/g, "")
      );
    }
  }, [title, slugManual]);

  const loadWheels = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/admin/quiz-wheels");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setWheels(data.wheels ?? []);
    } catch {
      // silent — list just stays empty
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadWheels();
  }, [isAdmin, loadWheels]);

  // ── Segment helpers ─────────────────────────────────────────────────────────
  const updateSegment = (idx, field, val) =>
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: val } : s)));

  const addSegment = () => setSegments((prev) => [...prev, blankSegment()]);

  const removeSegment = (idx) =>
    setSegments((prev) => prev.filter((_, i) => i !== idx));

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError("");
    const tagArr = tags
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
      .filter(Boolean);

    setSaving(true);
    try {
      const res = await fetch("/api/admin/quiz-wheels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, slug, tags: tagArr, segments }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setSavedSlug(data.slug);
      // Reset form
      setTitle(""); setDescription(""); setSlug(""); setSlugManual(false);
      setTags(""); setSegments([blankSegment()]); setShowForm(false);
      loadWheels();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleted = (id) => setWheels((prev) => prev.filter((w) => String(w._id) !== String(id)));

  // ── Auth guard ──────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" /> Loading…
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-semibold">
        Access denied.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Brain className="text-indigo-500" size={20} />
          <h1 className="text-xl font-black text-foreground">Quiz Wheels</h1>
          <span className="text-sm text-muted-foreground">/ Admin</span>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setSavedSlug(null); setSaveError(""); }}
          className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
        >
          <Plus size={11} /> {showForm ? "Cancel" : "New Quiz"}
        </button>
      </div>

      {/* Success banner */}
      {savedSlug && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 size={14} />
          Quiz wheel published at{" "}
          <Link href={`/wheels/${savedSlug}`} target="_blank" className="underline font-semibold">
            /wheels/{savedSlug}
          </Link>
        </div>
      )}

      {/* ── Create Form ───────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 space-y-5">
          <h2 className="font-bold text-foreground">Create New Quiz Wheel</h2>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Harry Potter Quiz Wheel"
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Description (SEO meta)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description shown in Google search results…"
              rows={2}
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              URL Slug{" "}
              <span className="text-muted-foreground font-normal">(auto-generated, or type to override)</span>
            </label>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-xs text-muted-foreground flex-shrink-0">/wheels/</span>
              <input
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
                placeholder="harry-potter-quiz-wheel"
                className="flex-1 text-sm text-foreground bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Tags <span className="font-normal text-muted-foreground">(comma-separated)</span>
            </label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="quiz, trivia, harry-potter, movies"
              className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Questions *
              </label>
              <button
                type="button"
                onClick={addSegment}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 font-semibold transition-colors"
              >
                <Plus size={9} /> Add Question
              </button>
            </div>
            <div className="space-y-3">
              {segments.map((seg, idx) => (
                <QuestionCard
                  key={idx}
                  seg={seg}
                  idx={idx}
                  onChange={updateSegment}
                  onRemove={removeSegment}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          {saveError && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <XCircle size={13} /> {saveError}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || segments.length === 0}
              className="flex items-center gap-2 text-sm px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold transition-colors"
            >
              {saving ? <Loader2 className="animate-spin" size={13} /> : <Brain size={13} />}
              {saving ? "Publishing…" : "Publish Quiz Wheel"}
            </button>
          </div>
        </div>
      )}

      {/* ── Existing quiz wheels list ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
          Existing Quiz Wheels{" "}
          {!loadingList && (
            <span className="normal-case font-normal">({wheels.length})</span>
          )}
        </h2>
        {loadingList ? (
          <div className="text-center py-8 text-muted-foreground">
            <Loader2 className="animate-spin inline mr-2" /> Loading…
          </div>
        ) : wheels.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            No quiz wheels yet. Click <strong>New Quiz</strong> to create your first one.
          </div>
        ) : (
          wheels.map((w) => (
            <QuizRow key={String(w._id)} wheel={w} onDeleted={handleDeleted} />
          ))
        )}
      </div>
    </div>
  );
}
