"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Star } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
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
  // DEBUG: Log the prop value on mount
  console.log("🔍 WorthItVote MOUNTED with topicPageId:", topicPageId, "| Type:", typeof topicPageId);
  
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();
  const storageKey = `worthit_${topicPageId}`;

  const [worthIt, setWorthIt] = useState(initialWorthIt);
  const [rating, setRating] = useState(initialRating);
  const [userRating, setUserRating] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Sync with server on mount / when session changes for authenticated user & fresh stats
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
          // Fallback to guest localStorage if API fetch fails or unauth
          setUserRating(parseInt(stored));
        }
      } catch (err) {
        // Silent catch
      }
    };
    fetchData();
  }, [topicPageId, storageKey, session]);

  const handleRate = useCallback(
    async (score, e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      
      console.log("=== WorthItVote.handleRate called ===", {score, session: !!session, topicPageId});
      if (submitting) return;
      
      if (!session) {
        console.log("No session - showing login prompt");
        openLoginPrompt("Rate this topic and join the community discussion!");
        return;
      }

      console.log("Session exists, submitting vote", {topicPageId, rating: score});
      setSubmitting(true);

      // Optimistic update
      const prevRating = userRating;
      setUserRating(score);

      try {
        console.log("Making fetch request to /api/worthit/vote");
        const res = await fetch("/api/worthit/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicPageId, rating: score }),
        });
        console.log("Fetch response status:", res.status, res.statusText);

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
    [submitting, topicPageId, userRating, storageKey, session, openLoginPrompt]
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
    <div className="mt-1">
      {/* ═════════════════════════════════════════════════════════════════
          SECTION 1: SOCIAL PROOF (Shown FIRST - High-Priority Change)
          Users see stats BEFORE interaction for maximum trust & conversion
          ═════════════════════════════════════════════════════════════════ */}
      {hasStats ? (
        <div className={`mb-2.5 p-2.5 rounded-lg bg-gradient-to-r ${sentiment.bg} border ${sentiment.border} animate-in fade-in duration-500`}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Consensus % with Early Badge */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className={`text-lg font-black leading-none ${sentiment.color} ${sentiment.darkColor}`}>
                  {worthItPct}%
                </div>
                <div className={`text-[9px] font-bold uppercase ${sentiment.color} opacity-70 tracking-tighter whitespace-nowrap`}>
                  {sentiment.label}
                </div>
              </div>
              
              {/* Early Consensus Badge - High-Priority Change */}
              {totalVotes < MIN_VOTES_FOR_EARLY_BADGE && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-orange-500" />
                  <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400">
                    Early
                  </span>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-border/30" />

            {/* Right: Average Rating */}
            <div className="text-right shrink-0">
              <div className={`text-lg font-black leading-none ${sentiment.color} ${sentiment.darkColor}`}>
                {avgRating} <span className="text-[10px] opacity-40">/ 5</span>
              </div>
              <div className={`text-[9px] font-bold uppercase ${sentiment.color} opacity-70 tracking-tighter`}>
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
        <div className="mb-2.5 p-2 rounded bg-primary/5 border border-primary/10">
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
        <p className={`text-[10px] font-bold uppercase tracking-widest mb-1.5 ${labelCls}`}>
          {userRating ? (
            <span className="text-emerald-500">Your Rating</span>
          ) : (
            getQuestion(type)
          )}
        </p>

        <div className="flex flex-col xs:flex-row xs:items-center gap-2 sm:gap-4 min-h-0 flex-wrap">
          {/* Stars with larger mobile tap targets - High-Priority Change */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 flex-shrink-0">
            {[1, 2, 3, 4, 5].map((star) => (
              <div key={star} className="flex flex-col items-center gap-1 w-8 sm:w-11">
                <button
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={(e) => handleRate(star, e)}
                  disabled={submitting}
                  type="button"
                  className="p-0.5 sm:p-1.5 transition-all duration-200 rounded-lg flex items-center justify-center hover:scale-110 hover:bg-primary/5 active:scale-95 cursor-pointer"
                  title={`Rate ${star} star${star > 1 ? "s" : ""}: ${getStarLabels(type)[star].text}`}
                  aria-label={`Rate ${star} out of 5 stars`}
                >
                  <Star
                    size={22}
                    className={`transition-all duration-300 flex-shrink-0 sm:hidden
                      ${(hoverRating || userRating) >= star
                        ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        : "text-muted-foreground/25"
                      }
                    `}
                  />
                  <Star
                    size={24}
                    className={`transition-all duration-300 flex-shrink-0 hidden sm:block
                      ${(hoverRating || userRating) >= star
                        ? "fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        : "text-muted-foreground/25"
                      }
                    `}
                  />
                </button>
                
                {/* Semantic labels below stars - High-Priority Change */}
                <div className="h-3 flex items-center justify-center">
                  {(hoverRating === star || userRating === star) && (
                    <span className={`text-[8px] sm:text-[9px] font-bold whitespace-nowrap
                      ${getStarLabels(type)[star].color} transition-all duration-200
                    `}>
                      {getStarLabels(type)[star].text}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Right Section: Rating Display & Loading spinner */}
          <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
            {userRating && (
              <div className="p-1 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shadow-sm animate-in fade-in duration-300">
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  ✓ You rated: {userRating}/5
                </span>
              </div>
            )}

            {/* Loading spinner */}
            {submitting && (
              <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
            )}
          </div>
        </div>
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
