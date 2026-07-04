// WorthItVote.js — IMPROVED VERSION with High-Priority Changes
// Key improvements:
// 1. Stats shown BEFORE stars (social proof upfront)
// 2. Semantic labels for each star
// 3. Larger mobile tap targets
// 4. Early consensus badge

"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";

const MIN_VOTES_STATS = 3;

// Semantic meanings for each rating level
const STAR_LABELS = {
  1: { text: "Skip It", color: "text-red-500" },
  2: { text: "Not Recommended", color: "text-orange-500" },
  3: { text: "It's OK", color: "text-yellow-500" },
  4: { text: "Worth Your Time", color: "text-lime-500" },
  5: { text: "Must Watch", color: "text-emerald-500" },
};

function getQuestion(type) {
  const map = {
    movie: "Rate this movie",
    anime: "Rate this anime",
    game: "Rate this game",
    character: "Rate this character",
  };
  return map[type] ?? "Rate this topic";
}

export default function WorthItVote({
  topicPageId,
  type,
  initialWorthIt = { yes: 0, no: 0, meh: 0 },
  initialRating = { totalScore: 0, count: 0 },
  onDark = false,
}) {
  const storageKey = `worthit_${topicPageId}`;

  const [worthIt, setWorthIt] = useState(initialWorthIt);
  const [rating, setRating] = useState(initialRating);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stored = localStorage.getItem(storageKey);
        
        const res = await fetch(`/api/worthit/vote?id=${topicPageId}`);
        if (res.ok) {
          const data = await res.json();
          setWorthIt(data.worthIt);
          setRating(data.rating);
          if (data.userRating) setUserRating(data.userRating);
        } else if (stored) {
          setUserRating(parseInt(stored));
        }
      } catch (err) {
        // Silent catch
      }
    };
    fetchData();
  }, [topicPageId, storageKey]);

  const handleRate = useCallback(
    async (score) => {
      if (submitting) return;
      setSubmitting(true);

      const prevRating = userRating;
      setUserRating(score);

      try {
        const res = await fetch("/api/worthit/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicPageId, rating: score }),
        });

        if (res.ok) {
          const data = await res.json();
          setWorthIt(data.worthIt);
          setRating(data.rating);
          try { localStorage.setItem(storageKey, score); } catch {}
        } else {
          setUserRating(prevRating);
        }
      } catch (err) {
        setUserRating(prevRating);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, topicPageId, userRating, storageKey]
  );

  const totalVotes = (worthIt?.yes || 0) + (worthIt?.no || 0) + (worthIt?.meh || 0);
  const consensusVotes = (worthIt?.yes || 0) + (worthIt?.no || 0);
  const worthItPct = consensusVotes > 0 ? Math.round(((worthIt?.yes || 0) / consensusVotes) * 100) : 0;
  const avgRating = rating?.count > 0 ? (rating.totalScore / rating.count).toFixed(1) : 0;
  
  const labelCls = onDark ? "text-gray-300" : "text-gray-500 dark:text-gray-400";
  const hasStats = totalVotes >= MIN_VOTES_STATS;

  return (
    <div className="mt-3">
      {/* ─────────────────────────────────────────────────────────────────
         SOCIAL PROOF SECTION (Shown FIRST, before user interaction)
         This is HIGH-PRIORITY improvement: Stats visible before voting
         ───────────────────────────────────────────────────────────────── */}
      {hasStats ? (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-amber-500/5 border border-emerald-200/30 dark:border-emerald-800/30">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Consensus % */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-lg font-black leading-none text-emerald-600 dark:text-emerald-400">
                  {worthItPct}%
                </div>
                <div className="text-[9px] font-bold uppercase text-emerald-500/70 tracking-tighter">
                  Worth It
                </div>
              </div>
              
              {/* Visual badge for early consensus */}
              {totalVotes < 10 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                  <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400">
                    Early
                  </span>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-border/30" />

            {/* Right: Average Rating */}
            <div className="text-right">
              <div className="text-lg font-black leading-none text-amber-600 dark:text-amber-400">
                {avgRating}
              </div>
              <div className="text-[9px] font-bold uppercase text-amber-500/70 tracking-tighter">
                Average
              </div>
            </div>

            {/* Vote count */}
            <div className="ml-auto text-right">
              <div className="text-[10px] font-medium text-muted-foreground">
                {totalVotes.toLocaleString()}
              </div>
              <div className="text-[9px] font-bold uppercase text-muted-foreground/60 tracking-tighter">
                Votes
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 p-2 rounded bg-primary/5 border border-primary/10">
          <p className="text-[10px] text-primary/60 font-medium">
            Be the first to rate this {type}
          </p>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────
         RATING SECTION (Interactive stars with semantic labels)
         HIGH-PRIORITY improvement: Show what each rating means
         ───────────────────────────────────────────────────────────────── */}
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${labelCls}`}>
          {userRating ? (
            <span className="text-emerald-500">Your Rating</span>
          ) : (
            getQuestion(type)
          )}
        </p>

        <div className="flex items-end gap-3">
          {/* Stars with larger mobile tap targets */}
          <div className="flex items-center gap-1 sm:gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="flex flex-col items-center gap-1">
                <button
                  onMouseEnter={() => !userRating && setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRate(star)}
                  disabled={submitting}
                  className={`p-1 sm:p-1.5 transition-all duration-200 rounded-lg
                    ${!userRating ? "hover:scale-110 hover:bg-primary/5 active:scale-95" : "cursor-default"}
                  `}
                  title={`Rate ${star} star${star > 1 ? "s" : ""}: ${STAR_LABELS[star].text}`}
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <Star
                    size={28}
                    className={`transition-all duration-300
                      ${(hoverRating || userRating) >= star
                        ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                        : "text-muted-foreground/25"
                      }
                    `}
                  />
                </button>
                
                {/* Semantic label below each star (mobile: only on hover/selection) */}
                {(hoverRating === star || userRating === star) && (
                  <span className={`text-[9px] font-bold whitespace-nowrap
                    ${STAR_LABELS[star].color} transition-all duration-200
                  `}>
                    {STAR_LABELS[star].text}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Your Rating Display */}
          {userRating && (
            <div className="ml-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                ✓ You rated: {userRating}/5
              </span>
            </div>
          )}

          {/* Loading spinner */}
          {submitting && (
            <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Label hint for first-time users */}
        {!userRating && totalVotes >= MIN_VOTES_STATS && (
          <p className="text-[9px] text-muted-foreground/60 mt-2 italic">
            Hover over stars to see rating descriptions
          </p>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
         COLD START STATE: No votes yet
         ───────────────────────────────────────────────────────────────── */}
      {!hasStats && totalVotes === 0 && (
        <div className="mt-3 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <p className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">
            💡 Help the community: be the first to rate this!
          </p>
        </div>
      )}
    </div>
  );
}
