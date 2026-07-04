"use client";

import { useState, useEffect, useCallback } from "react";
import { Star } from "lucide-react";

/**
 * WorthItVote — Upgraded Hybrid Star Rating & "Worth It?" widget
 * 
 * High-Priority Improvements:
 * 1. Social proof shown FIRST (stats above stars)
 * 2. Semantic labels ("Must Watch", "Skip It", etc.)
 * 3. Larger mobile tap targets (28px stars)
 * 4. Early consensus badge for social proof
 * 5. Cold start messaging & type-specific CTAs
 * 
 * Works for all content types: movie, anime, game, character, book, etc.
 * Database persistence for logged-in users, localStorage for guests.
 */

const MIN_VOTES_STATS = 3;
const MIN_VOTES_FOR_EARLY_BADGE = 10;

// Type-specific star labels for richer semantic meaning
const STAR_LABELS_BY_TYPE = {
  default: {
    1: { text: "Skip It", color: "text-red-500" },
    2: { text: "Not Recommended", color: "text-orange-500" },
    3: { text: "It's OK", color: "text-yellow-500" },
    4: { text: "Worth Your Time", color: "text-lime-500" },
    5: { text: "Must Watch", color: "text-emerald-500" },
  },
  game: {
    1: { text: "Skip It", color: "text-red-500" },
    2: { text: "Not Recommended", color: "text-orange-500" },
    3: { text: "It's OK", color: "text-yellow-500" },
    4: { text: "Worth Playing", color: "text-lime-500" },
    5: { text: "Must Play", color: "text-emerald-500" },
  },
  book: {
    1: { text: "Skip It", color: "text-red-500" },
    2: { text: "Not Recommended", color: "text-orange-500" },
    3: { text: "It's OK", color: "text-yellow-500" },
    4: { text: "Worth Reading", color: "text-lime-500" },
    5: { text: "Must Read", color: "text-emerald-500" },
  },
};

function getQuestion(type) {
  const map = {
    movie: "Rate this movie",
    anime: "Rate this anime",
    game: "Rate this game",
    character: "Rate this character",
    book: "Rate this book",
  };
  return map[type] ?? "Rate this topic";
}

function getStarLabels(type) {
  return STAR_LABELS_BY_TYPE[type] || STAR_LABELS_BY_TYPE.default;
}

function getColdStartMessage(type) {
  const map = {
    movie: "💡 Be the first to rate this movie!",
    anime: "💡 Be the first to rate this anime!",
    game: "💡 Be the first to rate this game!",
    character: "💡 Be the first to rate this character!",
    book: "💡 Be the first to rate this book!",
  };
  return map[type] ?? "💡 Help the community: be the first to rate this!";
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
  const [userVote, setUserVote] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Sync with server on mount for authenticated user & fresh stats
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
          if (data.userVote) setUserVote(data.userVote);
        } else if (stored) {
          // Fallback to guest localStorage if API fetch fails or unauth
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

      // Optimistic update
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
          setUserVote(data.userVote);
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
      {/* ═════════════════════════════════════════════════════════════════
          SECTION 1: SOCIAL PROOF (Shown FIRST - High-Priority Change)
          Users see stats BEFORE interaction for maximum trust & conversion
          ═════════════════════════════════════════════════════════════════ */}
      {hasStats ? (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-amber-500/5 border border-emerald-200/30 dark:border-emerald-800/30 animate-in fade-in duration-500">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Consensus % with Early Badge */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-lg font-black leading-none text-emerald-600 dark:text-emerald-400">
                  {worthItPct}%
                </div>
                <div className="text-[9px] font-bold uppercase text-emerald-500/70 tracking-tighter">
                  Worth It
                </div>
              </div>
              
              {/* Early Consensus Badge - High-Priority Change */}
              {totalVotes < MIN_VOTES_FOR_EARLY_BADGE && (
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

      {/* ═════════════════════════════════════════════════════════════════
          SECTION 2: RATING INTERACTION (Interactive stars)
          High-Priority Changes: Semantic labels + Larger tap targets
          ═════════════════════════════════════════════════════════════════ */}
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${labelCls}`}>
          {userRating ? (
            <span className="text-emerald-500">Your Rating</span>
          ) : (
            getQuestion(type)
          )}
        </p>

        <div className="flex items-end gap-3 min-h-[50px]">
          {/* Stars with larger mobile tap targets - High-Priority Change */}
          <div className="flex items-center gap-1 sm:gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="flex flex-col items-center gap-1 w-10 sm:w-12">
                <button
                  onMouseEnter={() => !userRating && setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleRate(star)}
                  disabled={submitting}
                  className={`p-1 sm:p-1.5 transition-all duration-200 rounded-lg flex items-center justify-center
                    ${!userRating ? "hover:scale-110 hover:bg-primary/5 active:scale-95" : "cursor-default"}
                  `}
                  title={`Rate ${star} star${star > 1 ? "s" : ""}: ${getStarLabels(type)[star].text}`}
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <Star
                    size={28}
                    className={`transition-all duration-300 flex-shrink-0
                      ${(hoverRating || userRating) >= star
                        ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                        : "text-muted-foreground/25"
                      }
                    `}
                  />
                </button>
                
                {/* Semantic labels below stars - High-Priority Change */}
                <div className="h-4 flex items-center justify-center">
                  {(hoverRating === star || userRating === star) && (
                    <span className={`text-[9px] font-bold whitespace-nowrap
                      ${getStarLabels(type)[star].color} transition-all duration-200
                    `}>
                      {getStarLabels(type)[star].text}
                    </span>
                  )}
                </div>
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
        {!userRating && hasStats && (
          <p className="text-[9px] text-muted-foreground/60 mt-2 italic">
            Hover over stars to see rating descriptions
          </p>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          SECTION 3: COLD START STATE (No votes yet)
          High-Priority Change: Type-specific messaging
          ═════════════════════════════════════════════════════════════════ */}
      {!hasStats && totalVotes === 0 && (
        <div className="mt-3 p-2 rounded-lg bg-blue-500/5 border border-blue-500/20 animate-in fade-in duration-500">
          <p className="text-[9px] text-blue-600 dark:text-blue-400 font-medium">
            {getColdStartMessage(type)}
          </p>
        </div>
      )}
    </div>
  );
}
