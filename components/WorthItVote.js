"use client";

import { useState, useEffect, useCallback } from "react";

// ---------------------------------------------------------------------------
// WorthItVote — "Worth It?" community vote widget
//
// Renders a single contextual yes/no question whose label changes by content
// type so the same component works across anime, movies, games, characters,
// products, and any custom type.
//
// Double-vote prevention (no login required):
//   A localStorage key "worthit_<topicPageId>" is set after voting. On mount
//   the component reads this key and pre-selects the stored vote, disabling
//   the buttons. This is intentionally lightweight — it stops accidental
//   double taps without adding login friction. Server-side deduplication
//   can be layered on later without changing this component's interface.
//
// Score display:
//   < MIN_VOTES_FOR_BAR votes → show plain Yes / No buttons
//   ≥ MIN_VOTES_FOR_BAR votes → show filled percentage bar
//
// Props:
//   topicPageId  — MongoDB _id string of the current TopicPage
//   type         — content type ("movie" | "anime" | "game" | "character" | "product" | string)
//   initialYes   — yes count from server render (avoids extra GET on mount)
//   initialNo    — no count from server render
// ---------------------------------------------------------------------------

// Minimum total votes before the percentage bar is shown instead of buttons
const MIN_VOTES_FOR_BAR = 10;

// Map content type → contextual question label
function getQuestion(type) {
  const map = {
    movie:     "Worth watching?",
    anime:     "Worth watching?",
    game:      "Worth playing?",
    character: "Fan favourite?",
    product:   "Worth buying?",
  };
  return map[type] ?? "Worth it?";
}

// Derives the display percentage string for the yes side (0–100, rounded).
function yesPercent(yes, no) {
  const total = yes + no;
  if (total === 0) return 0;
  return Math.round((yes / total) * 100);
}

export default function WorthItVote({
  topicPageId,
  type,
  initialYes = 0,
  initialNo  = 0,
  onDark     = false,
}) {
  const storageKey = `worthit_${topicPageId}`;

  const [yes,         setYes]         = useState(initialYes);
  const [no,          setNo]          = useState(initialNo);
  const [voted,       setVoted]       = useState(null);   // "yes" | "no" | null
  const [submitting,  setSubmitting]  = useState(false);

  // On mount: restore previous vote from localStorage so the UI reflects
  // the user's earlier choice without needing an account.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === "yes" || stored === "no") setVoted(stored);
    } catch {
      // localStorage unavailable (SSR guard / private browsing)
    }
  }, [storageKey]);

  const handleVote = useCallback(
    async (choice) => {
      // Guard: already voted or request in flight
      if (voted || submitting) return;

      setSubmitting(true);

      // Optimistic update — feels instant to the user
      if (choice === "yes") setYes((v) => v + 1);
      else setNo((v) => v + 1);
      setVoted(choice);

      try {
        localStorage.setItem(storageKey, choice);
      } catch {
        // Ignore if localStorage is unavailable
      }

      try {
        const res = await fetch("/api/worthit/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicPageId, vote: choice }),
        });

        if (res.ok) {
          // Sync with server-authoritative counts after successful write
          const data = await res.json();
          setYes(data.yes);
          setNo(data.no);
        } else {
          // Revert optimistic update on failure
          if (choice === "yes") setYes((v) => v - 1);
          else setNo((v) => v - 1);
          setVoted(null);
          try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
        }
      } catch {
        // Network error — revert
        if (choice === "yes") setYes((v) => v - 1);
        else setNo((v) => v - 1);
        setVoted(null);
        try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      } finally {
        setSubmitting(false);
      }
    },
    [voted, submitting, topicPageId, storageKey]
  );

  const total      = yes + no;
  const pct        = yesPercent(yes, no);
  const showBar    = total >= MIN_VOTES_FOR_BAR;
  const question   = getQuestion(type);

  // Colour tokens — adapt to dark cinematic backdrop vs plain page surface
  const labelCls  = onDark ? "text-gray-300"            : "text-gray-500 dark:text-gray-400";
  const subCls    = onDark ? "text-gray-400"            : "text-gray-500";
  const barBgCls  = onDark ? "bg-white/10"              : "bg-gray-200 dark:bg-white/10";
  const barLblCls = onDark ? "text-gray-300"            : "text-gray-600 dark:text-gray-300";
  const btnDflt   = onDark ? "bg-white/10 text-white"   : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white";
  const btnOther  = onDark ? "bg-white/5 text-gray-500" : "bg-gray-100 dark:bg-white/5 text-gray-400";

  return (
    <div className="mt-1">
      {/* Question label */}
      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${labelCls}`}>
        {question}
      </p>

      {showBar ? (
        /* ── Percentage bar (shown once enough votes exist) ───────────── */
        <div className="max-w-xs">
          {/* Bar */}
          <div className={`relative h-2 rounded-full overflow-hidden mb-1.5 ${barBgCls}`}>
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-green-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Labels */}
          <div className={`flex justify-between text-xs ${barLblCls}`}>
            <span>
              👍 {pct}%{" "}
              {voted === "yes" && (
                <span className="text-green-400 font-semibold">(your vote)</span>
              )}
            </span>
            <span className="text-gray-500">{total.toLocaleString()} votes</span>
            <span>
              {voted === "no" && (
                <span className="text-red-400 font-semibold">(your vote) </span>
              )}
              👎 {100 - pct}%
            </span>
          </div>
        </div>
      ) : (
        /* ── Voting buttons (shown before MIN_VOTES_FOR_BAR threshold) ── */
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote("yes")}
            disabled={!!voted || submitting}
            className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-1.5 transition-all
              ${voted === "yes"
                ? "bg-green-500 text-white ring-2 ring-green-400/50 cursor-default"
                : voted
                ? `${btnOther} cursor-not-allowed`
                : `${btnDflt} hover:bg-green-500 hover:text-white`
              }`}
          >
            👍 Yes
          </button>

          <button
            onClick={() => handleVote("no")}
            disabled={!!voted || submitting}
            className={`flex items-center gap-1.5 text-xs font-semibold rounded-full px-4 py-1.5 transition-all
              ${voted === "no"
                ? "bg-red-500 text-white ring-2 ring-red-400/50 cursor-default"
                : voted
                ? `${btnOther} cursor-not-allowed`
                : `${btnDflt} hover:bg-red-500 hover:text-white`
              }`}
          >
            👎 No
          </button>

          {/* Soft prompt before any votes exist */}
          {total === 0 && !voted && (
            <span className={`text-xs italic ${subCls}`}>
              Be the first to vote!
            </span>
          )}

          {/* Vote count hint once some votes exist but below bar threshold */}
          {total > 0 && total < MIN_VOTES_FOR_BAR && (
            <span className={`text-xs ${subCls}`}>
              {total} vote{total !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
