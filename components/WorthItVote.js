"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { useEntityTracking } from "@components/EntityTrackingProvider";
import { 
  calculateConsensusPercent, 
  calculateAverageRating,
  getConsensusSentiment 
} from "@lib/worthItLogic";

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
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const entityTracking = useEntityTracking();
  const storageKey = `worthit_${topicPageId}`;

  const [worthIt, setWorthIt] = useState(initialWorthIt);
  const [rating, setRating] = useState(initialRating);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Sync with server on mount / when session changes for authenticated user & fresh stats
  // For guest users: initialWorthIt and initialRating are already baked into the ISR HTML!
  // Only authenticated users need to hit the server to check their personal rating.
  useEffect(() => {
    // Check localStorage first (instant synchronous check for guest or offline vote)
    const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) {
        setUserRating(parsed);
        entityTracking?.setUserRating?.(parsed);
      }
    }

    // If guest / unauthenticated, do NOT fire a network request — use the server-rendered stats!
    if (!session) return;

    let cancelled = false;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/worthit/vote?id=${topicPageId}`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setWorthIt(data.worthIt);
          setRating(data.rating);
          if (data.userRating) {
            setUserRating(data.userRating);
            entityTracking?.setUserRating?.(data.userRating);
          }
        }
      } catch (err) {
        // Silent catch
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [topicPageId, storageKey, session, entityTracking]);

  // Keep internal userRating in sync if updated from external modal (TrackQuickButton)
  useEffect(() => {
    if (entityTracking?.userRating && entityTracking.userRating !== userRating) {
      setUserRating(entityTracking.userRating);
      // Re-fetch fresh stats
      fetch(`/api/worthit/vote?id=${topicPageId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.worthIt) setWorthIt(data.worthIt);
          if (data.rating) setRating(data.rating);
        })
        .catch(() => {});
    }
  }, [entityTracking?.userRating, userRating, topicPageId]);

  const handleRate = useCallback(
    async (score, e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      if (submitting) return;
      
      if (!session) {
        openLoginPrompt("Rate this topic and join the community discussion!");
        return;
      }

      setSubmitting(true);

      // Optimistic update
      const prevRating = userRating;
      setUserRating(score);
      entityTracking?.setUserRating?.(score);

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

          // Auto-mark as Watched / Played in client state if not already done
          if (entityTracking?.setStatusData && entityTracking?.statusData?.status !== "done") {
            entityTracking.setStatusData({ status: "done" });
          }
        } else {
          setUserRating(prevRating);
          entityTracking?.setUserRating?.(prevRating);
        }
      } catch (err) {
        setUserRating(prevRating);
        entityTracking?.setUserRating?.(prevRating);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, topicPageId, userRating, storageKey, session, openLoginPrompt, entityTracking]
  );

  const totalVotes = (worthIt?.yes || 0) + (worthIt?.no || 0) + (worthIt?.meh || 0);
  
  // Memoize calculations to prevent recalculation on every render
  const { consensusVotes, worthItPct, avgRating, sentiment } = useMemo(() => {
    const consensus = (worthIt?.yes || 0) + (worthIt?.no || 0);
    const pct = calculateConsensusPercent(worthIt);
    const avg = calculateAverageRating(rating);
    const sent = getConsensusSentiment(pct);
    
    return { 
      consensusVotes: consensus, 
      worthItPct: pct, 
      avgRating: avg, 
      sentiment: sent 
    };
  }, [worthIt, rating]);
  
  const labelCls = onDark ? "text-gray-300" : "text-gray-500 dark:text-gray-400";
  const hasStats = totalVotes >= MIN_VOTES_STATS;

  return (
    <div className="mt-1 space-y-1.5">
      {/* ── Top Stacked Box: Social Proof & Stats Summary ─────────────── */}
      <div className="p-2 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-3">
        {hasStats ? (
          <div className="flex items-center gap-3">
            {/* Consensus % */}
            <div className="flex flex-col">
              <span className="text-base font-black text-emerald-500 leading-none">
                {worthItPct}%
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-500/80 mt-0.5">
                Worth It
              </span>
            </div>

            <div className="h-5 w-px bg-border/40" />

            {/* Average Rating */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-black text-foreground leading-none">
                  {avgRating}
                </span>
                <span className="text-xs text-muted-foreground/60 font-medium">/ 5</span>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 mt-0.5">
                Average
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/70 italic">
            Be the first to rate this {type}
          </span>
        )}

        {/* Total Votes */}
        {hasStats && (
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-foreground leading-none">
              {totalVotes.toLocaleString()}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mt-0.5">
              Votes
            </span>
          </div>
        )}
      </div>

      {/* ── Bottom Stacked Box: Star Rating Action ──────────────────────── */}
      <div className="p-2 rounded-xl bg-muted/20 border border-border/40 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {userRating ? (
              <span className="text-emerald-500 font-extrabold">Your Rating: {userRating}/5</span>
            ) : hoverRating ? (
              <span className={getStarLabels(type)[hoverRating]?.color}>
                {getStarLabels(type)[hoverRating]?.text}
              </span>
            ) : (
              getQuestion(type)
            )}
          </p>

          {submitting && (
            <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Stars (left-aligned, fixed size/gap, never stretched) */}
        <div className="flex items-center justify-start gap-1 sm:gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={(e) => handleRate(star, e)}
              disabled={submitting}
              type="button"
              className="p-1 transition-transform duration-150 hover:scale-110 active:scale-95 cursor-pointer flex-shrink-0"
              title={`Rate ${star}: ${getStarLabels(type)[star]?.text}`}
              aria-label={`Rate ${star} out of 5 stars`}
            >
              <Star
                size={22}
                className={`transition-all duration-200
                  ${(hoverRating || userRating) >= star
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                  }
                `}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
