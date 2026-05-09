"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

const ADMIN_EMAIL = "gauravsingh9314@gmail.com";

const ENTITY_TYPES = ["", "anime", "movie", "game", "character"];
const TIERS = ["common", "rare", "epic"];

const TIER_STYLES = {
  common: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  rare:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  epic:   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

// The default seed data (mirrors seedChallenges.js)
const SEED_CHALLENGES = [
  {
    title: "The First Episode Test",
    description: "Spin the anime wheel, watch the first episode of whatever you land on.",
    entityType: "anime", tier: "common", badgeSlug: "anime-first-episode", streakDays: 0,
    taskInstruction: "Spin any Anime wheel, watch Episode 1 of your result, then verify below.",
    verificationHint: "Answer 2 out of 3 questions about the anime you watched.",
    quizQuestions: 3, quizPassThreshold: 2, active: true,
  },
  {
    title: "Genre Explorer",
    description: "Land on 3 different anime genres and watch an episode from each.",
    entityType: "anime", tier: "rare", badgeSlug: "anime-genre-explorer", streakDays: 0,
    taskInstruction: "Spin 3 times, land on different genres, watch an episode each time.",
    verificationHint: "Answer 3 out of 5 questions correctly to prove you watched.",
    quizQuestions: 5, quizPassThreshold: 3, active: true,
  },
  {
    title: "Anime Marathoner",
    description: "Spin the anime wheel and watch something for 7 consecutive days.",
    entityType: "anime", tier: "epic", badgeSlug: "anime-marathoner", streakDays: 7,
    taskInstruction: "Spin and log a completed anime watch every day for 7 days.",
    verificationHint: "Pass the quiz on your final day's pick to complete the challenge.",
    quizQuestions: 5, quizPassThreshold: 3, active: true,
  },
  {
    title: "Movie Night",
    description: "Let the wheel decide your next movie. Then actually watch it.",
    entityType: "movie", tier: "common", badgeSlug: "movie-night", streakDays: 0,
    taskInstruction: "Spin a Movie wheel, watch the result, then verify below.",
    verificationHint: "Answer 2 out of 3 questions about the movie you watched.",
    quizQuestions: 3, quizPassThreshold: 2, active: true,
  },
  {
    title: "Genre Hopper",
    description: "Watch a movie from 3 different genres decided by the wheel.",
    entityType: "movie", tier: "rare", badgeSlug: "cinephile", streakDays: 0,
    taskInstruction: "Spin 3 times in different genre categories and watch each result.",
    verificationHint: "Answer 3 of 5 questions about your final movie to verify.",
    quizQuestions: 5, quizPassThreshold: 3, active: true,
  },
  {
    title: "Backlog Roulette",
    description: "Spin the game wheel and actually play what it lands on tonight.",
    entityType: "game", tier: "common", badgeSlug: "backlog-buster", streakDays: 0,
    taskInstruction: "Spin a Game wheel, play the result for at least 30 minutes.",
    verificationHint: "Answer 2 out of 3 questions about the game to verify.",
    quizQuestions: 3, quizPassThreshold: 2, active: true,
  },
  {
    title: "Character Deep Dive",
    description: "Spin for a character and learn their backstory, powers, and arc.",
    entityType: "character", tier: "common", badgeSlug: "character-pick", streakDays: 0,
    taskInstruction: "Spin a Character wheel, read up on the result, then verify.",
    verificationHint: "Answer 2 out of 3 questions about the character.",
    quizQuestions: 3, quizPassThreshold: 2, active: true,
  },
];

const blankChallenge = () => ({
  title: "", description: "", entityType: "", tier: "common",
  badgeSlug: "", streakDays: 0,
  taskInstruction: "", verificationHint: "",
  quizQuestions: 3, quizPassThreshold: 2, active: true,
  wheelId: null, wheelTitle: "", wheelPath: "",
});

// ── Admin API helpers ─────────────────────────────────────────────────────────
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

// ── Challenge row ─────────────────────────────────────────────────────────────
function ChallengeRow({ challenge, onToggle, onDelete, onEdit }) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(challenge._id, !challenge.active);
    setToggling(false);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${challenge.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(challenge._id);
    setDeleting(false);
  };

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white max-w-[180px] truncate">
        {challenge.title}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TIER_STYLES[challenge.tier]}`}>
          {challenge.tier}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 capitalize">
        {challenge.entityType || "generic"}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 max-w-[140px]">
        {challenge.wheelId ? (
          <a
            href={`/uwheels/${challenge.wheelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 hover:underline truncate block"
            title={challenge.wheelTitle}
          >
            🎡 {challenge.wheelTitle || "Linked wheel"}
          </a>
        ) : (
          <span className="text-gray-300 dark:text-gray-600 italic">Any wheel</span>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
        {challenge.badgeSlug}
      </td>
      <td className="px-4 py-3 text-xs text-center">
        <span className={`px-2 py-0.5 rounded-full font-semibold ${challenge.active ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
          {challenge.active ? "Active" : "Hidden"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(challenge)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            {toggling ? "…" : challenge.active ? "Hide" : "Show"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Wheel search picker ────────────────────────────────────────────────────
function WheelPicker({ value, valueTitle, valuePath, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useState(null);

  const search = async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/challenges/search-wheels?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
      setOpen(true);
    } catch { setResults([]); }
    setSearching(false);
  };

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef[0]);
    timerRef[0] = setTimeout(() => search(q), 300);
  };

  const select = (wheel) => {
    onChange(wheel.wheelId, wheel.title, wheel.path);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const clear = () => onChange(null, "", "");

  return (
    <div className="relative">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">
        Linked Wheel <span className="font-normal text-gray-400">(optional — pins challenge to a specific wheel)</span>
      </span>
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
          <span className="text-sm text-indigo-700 dark:text-indigo-300 flex-1 font-medium truncate">🎡 {valueTitle}</span>
          <a
            href={valuePath || `/uwheels/${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-500 hover:underline"
          >↗</a>
          <button type="button" onClick={clear} className="text-xs text-red-500 hover:text-red-700">✕ Remove</button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={handleInput}
            placeholder="Search wheel by title…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searching && <span className="absolute right-3 top-8 text-xs text-gray-400">Searching…</span>}
          {open && results.length > 0 && (
            <ul className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-48 overflow-y-auto">
              {results.map((w) => (
                <li key={w.path || w.wheelId}>
                  <button
                    type="button"
                    onClick={() => select(w)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2 transition-colors"
                  >
                    {w.preview && <img src={w.preview} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />}
                    <span className="truncate">{w.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {open && results.length === 0 && !searching && query.length >= 2 && (
            <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg px-3 py-2 text-sm text-gray-400">
              No wheels found.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Create / Edit form ────────────────────────────────────────────────────────
function ChallengeForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || blankChallenge());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.badgeSlug.trim()) {
      setError("Title and Badge Slug are required.");
      return;
    }
    setSaving(true);
    setError("");
    await onSave(form);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="font-bold text-gray-900 dark:text-white text-base">
        {initial?._id ? "Edit Challenge" : "New Challenge"}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Title *</span>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required maxLength={120}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Badge Slug * <span className="font-normal">(e.g. anime-first-episode)</span></span>
          <input value={form.badgeSlug} onChange={(e) => set("badgeSlug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} required
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white font-mono outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Description</span>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} maxLength={500}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Category</span>
          <select value={form.entityType} onChange={(e) => set("entityType", e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t || "Generic (any wheel)"}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Tier</span>
          <select value={form.tier} onChange={(e) => set("tier", e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500">
            {TIERS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Streak Days (0 = one-time)</span>
          <input type="number" min={0} max={30} value={form.streakDays} onChange={(e) => set("streakDays", parseInt(e.target.value) || 0)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Task Instruction</span>
        <input value={form.taskInstruction} onChange={(e) => set("taskInstruction", e.target.value)} maxLength={300}
          placeholder="e.g. Spin any Anime wheel, watch Episode 1, then verify below."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Verification Hint</span>
        <input value={form.verificationHint} onChange={(e) => set("verificationHint", e.target.value)} maxLength={300}
          placeholder="e.g. Answer 2 out of 3 questions to earn the badge."
          className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
      </label>

      <WheelPicker
        value={form.wheelId}
        valueTitle={form.wheelTitle}
        valuePath={form.wheelPath}
        onChange={(id, title, path) => {
          set("wheelId", id);
          set("wheelTitle", title);
          set("wheelPath", path);
        }}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Quiz Questions (3–5)</span>
          <input type="number" min={3} max={5} value={form.quizQuestions} onChange={(e) => set("quizQuestions", parseInt(e.target.value) || 3)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Pass Threshold</span>
          <input type="number" min={1} max={form.quizQuestions} value={form.quizPassThreshold} onChange={(e) => set("quizPassThreshold", parseInt(e.target.value) || 2)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" />
        </label>
        <label className="flex items-center gap-2 mt-5 cursor-pointer select-none col-span-2">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)}
            className="w-4 h-4 rounded accent-indigo-600" />
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Active (visible to users)</span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : initial?._id ? "Update Challenge" : "Create Challenge"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminChallengesPage() {
  const { data: session, status } = useSession();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState("");
  const [toast, setToast] = useState("");

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiFetch("/api/admin/challenges");
    if (ok && Array.isArray(data)) setChallenges(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) loadChallenges();
  }, [isAdmin, loadChallenges]);

  // ── Seed defaults ──────────────────────────────────────────────────────────
  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult("");
    const { ok, data } = await apiFetch("/api/admin/challenges/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challenges: SEED_CHALLENGES }),
    });
    setSeeding(false);
    if (ok) {
      setSeedResult(`✅ Created ${data.created}, skipped ${data.skipped} (already existed).`);
      loadChallenges();
    } else {
      setSeedResult("❌ Seed failed: " + (data.error || "unknown error"));
    }
  };

  // ── Create ─────────────────────────────────────────────────────────────────
  const handleCreate = async (form) => {
    const { ok, data } = await apiFetch("/api/admin/challenges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (ok) {
      showToast("✅ Challenge created.");
      setShowForm(false);
      loadChallenges();
    } else {
      showToast("❌ " + (data.error || "Create failed."));
    }
  };

  // ── Update ─────────────────────────────────────────────────────────────────
  const handleUpdate = async (form) => {
    const { ok, data } = await apiFetch(`/api/admin/challenges/${editTarget._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (ok) {
      showToast("✅ Challenge updated.");
      setEditTarget(null);
      loadChallenges();
    } else {
      showToast("❌ " + (data.error || "Update failed."));
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const handleToggle = async (id, active) => {
    const { ok } = await apiFetch(`/api/admin/challenges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (ok) {
      setChallenges((prev) => prev.map((c) => (c._id === id ? { ...c, active } : c)));
      showToast(active ? "✅ Challenge is now visible." : "🙈 Challenge hidden.");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const { ok } = await apiFetch(`/api/admin/challenges/${id}`, { method: "DELETE" });
    if (ok) {
      setChallenges((prev) => prev.filter((c) => c._id !== id));
      showToast("🗑️ Challenge deleted.");
    }
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (status === "loading") {
    return <div className="p-8 text-gray-400">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 font-semibold">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏆 Challenge Manager</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Create, edit, and manage challenges shown on the /challenges page.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {seeding ? "Seeding…" : "⬇️ Seed Defaults"}
          </button>
          <button
            onClick={() => { setShowForm(true); setEditTarget(null); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            + New Challenge
          </button>
        </div>
      </div>

      {/* Seed result message */}
      {seedResult && (
        <p className="text-sm px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
          {seedResult}
        </p>
      )}

      {/* Create form */}
      {showForm && !editTarget && (
        <ChallengeForm
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Edit form */}
      {editTarget && (
        <ChallengeForm
          initial={editTarget}
          onSave={handleUpdate}
          onCancel={() => setEditTarget(null)}
        />
      )}

      {/* Challenge table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800/60 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {challenges.length} challenge{challenges.length !== 1 ? "s" : ""}
          </span>
          <button onClick={loadChallenges} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            ↺ Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm animate-pulse">Loading challenges…</div>
        ) : challenges.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <p className="text-3xl mb-2">🎯</p>
            <p className="font-medium">No challenges yet.</p>
            <p className="text-sm mt-1">Click "Seed Defaults" to add the starter set, or create one manually.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Wheel</th>
                  <th className="px-4 py-3">Badge Slug</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-50 dark:divide-gray-800">
                {challenges.map((c) => (
                  <ChallengeRow
                    key={c._id}
                    challenge={c}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                    onEdit={(c) => { setEditTarget(c); setShowForm(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium shadow-xl animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
