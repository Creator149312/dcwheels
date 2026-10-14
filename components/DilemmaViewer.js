"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { trackAffinity } from "@utils/affinity";
import toast from "react-hot-toast";
import Link from "next/link";
import { Share2, Sparkles } from "lucide-react";

// Lazy-load share modal on click to keep initial bundle light
const DilemmaShareModal = dynamic(() => import("./DilemmaShareModal"), { ssr: false });

/**
 * DilemmaViewer — displays a post's poll options as clickable dilemma cards
 *
 * Hybrid voting flow:
 * - Anonymous user clicks → bars reveal immediately (optimistic +1), signup nudge appears
 * - Logged-in user clicks → API call, vote persisted
 */
export default function DilemmaViewer({ post, postId, onVoteSuccess, initialVotedOptionId = null }) {
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const [voted, setVoted] = useState(() => !!initialVotedOptionId || !!post?.userVotedOptionId);
  const [selectedOptionId, setSelectedOptionId] = useState(() => initialVotedOptionId || post?.userVotedOptionId || null);
  const [loading, setLoading] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  // optionId picked by an anonymous user — triggers optimistic reveal
  const [optimisticPick, setOptimisticPick] = useState(null);
  const [voteCounts, setVoteCounts] = useState(
    Object.fromEntries(post.pollOptions?.map((o) => [o._id, o.voteCount]) || [])
  );

  if (!post.hasPoll || !post.pollOptions || post.pollOptions.length === 0) {
    return null;
  }

  // For display, add +1 to the option the anon user clicked
  const displayCounts = optimisticPick
    ? { ...voteCounts, [optimisticPick]: (voteCounts[optimisticPick] || 0) + 1 }
    : voteCounts;

  const totalVotes = Object.values(displayCounts).reduce((a, b) => a + b, 0);
  const revealBars = voted || !!optimisticPick;

  const handleVote = async (optionId) => {
    if (revealBars || loading) return;

    // Haptic feedback on mobile if supported
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(12);
      } catch {}
    }

    // Affinity capture: a vote is a strong fandom signal. Works for guests too
    // (tracked in localStorage — the warm feed personalizes on their next visit).
    trackAffinity(post?.contentRef?.type || "anime", "vote");

    // Frictionless voting: both registered users and guest sessions register their vote via the API.
    setLoading(true);
    try {
      const res = await fetch(`/api/post/${postId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });

      if (res.ok) {
        const data = await res.json();
        const newCounts = Object.fromEntries(
          data.options.map((o) => [o._id ?? o.id, o.voteCount])
        );
        setVoteCounts(newCounts);
        setOptimisticPick(null);
        setSelectedOptionId(optionId);
        setVoted(true);
        toast.success("Vote recorded!");
        const chosen = post.pollOptions.find((o) => (o._id ?? o.id) === optionId);
        onVoteSuccess?.(chosen?.text || "");
      } else if (res.status === 409) {
        setSelectedOptionId(optionId);
        setVoted(true);
        toast("You already voted on this poll");
        const chosen = post.pollOptions.find((o) => (o._id ?? o.id) === optionId);
        onVoteSuccess?.(chosen?.text || "");
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to vote");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickedOption = post.pollOptions.find((o) => o._id === optimisticPick);
  const isTwoOptions = post.pollOptions.length === 2;
  const anyHasImage = post.pollOptions.some((o) => !!o.image);

  return (
    <div className="space-y-3">
      {/* ── Unified Poll Options Grid ──────────────────────────────────────── */}
      <div
        className={`relative grid gap-2 sm:gap-2.5 ${
          anyHasImage
            ? isTwoOptions
              ? "grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3"
            : isTwoOptions
            ? "grid-cols-2"
            : "grid-cols-1 sm:grid-cols-2"
        }`}
      >
        {/* Central "VS" badge for 2-option comparisons */}
        {isTwoOptions && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card border-2 border-primary/30 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black tracking-wider text-primary pointer-events-none ring-4 ring-background">
            VS
          </div>
        )}

        {post.pollOptions.map((option, idx) => {
          const optId = String(option._id ?? idx);
          const isSelected = selectedOptionId && String(selectedOptionId) === optId;
          const count = displayCounts[option._id] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const hasImage = !!option.image;

          return (
            <button
              key={`${postId}-${option._id ?? idx}`}
              onClick={() => handleVote(option._id)}
              disabled={revealBars || loading}
              className={`relative w-full overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-primary/15 text-left
                ${
                  hasImage
                    ? "aspect-square bg-muted"
                    : isTwoOptions
                    ? "min-h-[84px] sm:min-h-[110px] p-3 sm:p-4 flex flex-col justify-between bg-card"
                    : "min-h-[48px] sm:min-h-[56px] px-3.5 py-3 sm:p-4 flex items-center justify-between bg-card"
                }
                ${
                  isSelected
                    ? "border-primary shadow-sm ring-2 ring-primary/20"
                    : !revealBars
                    ? "border-border hover:border-primary/60 hover:shadow-md hover:bg-primary/[0.02] active:scale-[0.98]"
                    : "border-border/80 cursor-default"
                }
                disabled:cursor-not-allowed
              `}
            >
              {/* Image background if option has an image */}
              {hasImage ? (
                <>
                  <img
                    src={option.imageVariants?.md || option.imageVariants?.sm || option.image}
                    srcSet={
                      option.imageVariants
                        ? `${option.imageVariants.sm} 240w, ${option.imageVariants.md} 480w`
                        : undefined
                    }
                    sizes="(max-width: 640px) 50vw, 240px"
                    alt={option.text}
                    width={480}
                    height={480}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {/* Caption gradient over image */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 sm:p-4 z-10">
                    <p className="text-white font-bold text-sm sm:text-base leading-snug line-clamp-2">
                      {option.text}
                    </p>
                  </div>
                </>
              ) : isTwoOptions ? (
                /* Two-option text card (vertical layout with VS badge) */
                <div className="relative z-10 flex-1 flex items-center pr-1">
                  <span className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-3">
                    {option.text}
                  </span>
                </div>
              ) : (
                /* 3+ Option text row (clean horizontal thumb-friendly bar) */
                <div className="relative z-10 flex-1 flex items-center pr-3 min-w-0">
                  <span className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug truncate">
                    {option.text}
                  </span>
                </div>
              )}

              {/* Vote result progress fill */}
              {revealBars && (
                <div
                  className={`absolute inset-0 transition-all duration-700 ease-out ${
                    hasImage ? "bg-primary/25" : "bg-primary/10 dark:bg-primary/20"
                  }`}
                  style={
                    hasImage
                      ? { opacity: Math.max(0.2, percentage / 100) }
                      : { width: `${percentage}%` }
                  }
                />
              )}

              {/* Percentage & Vote Count Badge (after reveal) */}
              {revealBars && (
                <div
                  className={`z-20 flex items-center gap-2 ${
                    hasImage
                      ? "absolute top-2.5 left-2.5 m-0 p-0"
                      : isTwoOptions
                      ? "relative z-10 justify-between border-t border-border/60 mt-2 pt-1"
                      : "relative z-10 shrink-0 justify-end"
                  }`}
                >
                  {isSelected && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Your vote
                    </span>
                  )}
                  <span
                    className={`font-black text-xs sm:text-sm ${
                      hasImage
                        ? "bg-black/80 text-white px-2.5 py-1 rounded-lg backdrop-blur-md shadow-md border border-white/20"
                        : "text-primary"
                    }`}
                  >
                    {percentage}%
                  </span>
                  {!hasImage && isTwoOptions && (
                    <span className="text-xs text-muted-foreground font-medium">
                      {count.toLocaleString()} {count === 1 ? "vote" : "votes"}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Unvoted Poll Status Bar (Total engagement proof) ──────────────── */}
      {!revealBars && (
        <div className="flex items-center justify-between text-xs text-muted-foreground/80 px-1 pt-0.5">
          <span className="font-semibold text-muted-foreground uppercase tracking-wider text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/70 inline-block animate-pulse" />
            {totalVotes > 0
              ? `${totalVotes.toLocaleString()} ${totalVotes === 1 ? "vote" : "votes"} in poll`
              : "0 votes in poll"}
          </span>
          <span className="text-xs text-muted-foreground/60 font-medium">
            Vote to see results
          </span>
        </div>
      )}

      {/* ── Confirmed vote feedback ───────────────────────────────────────── */}
      {voted && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-xs text-muted-foreground">
              ✓ Vote recorded — {totalVotes.toLocaleString()}{" "}
              {totalVotes === 1 ? "person has" : "people have"} voted
            </p>

            {/* 1-Click Viral Share Card Trigger */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold transition border border-primary/20 hover:border-primary/40 shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Share Verdict Card</span>
            </button>
          </div>

          {/* Gentle, non-blocking upsell for guests after they participate */}
          {!session?.user && (
            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-xs">
              <span className="text-muted-foreground truncate">
                Save your votes & build your Fandom Passport:
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openLoginPrompt?.()}
                  className="font-semibold text-primary hover:underline"
                >
                  Log in
                </button>
                <span className="text-muted-foreground/40">•</span>
                <Link
                  href="/register"
                  className="font-semibold text-primary hover:underline"
                >
                  Sign up
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Share Verdict Card Modal ──────────────────────────────────────── */}
      {showShareModal && (
        <DilemmaShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          postTitle={post?.title || post?.content || "Pop Culture Dilemma"}
          options={post?.pollOptions || []}
          voteCounts={displayCounts}
          selectedOptionId={selectedOptionId}
        />
      )}

      {/* ── Fallback nudge (if any optimistic state pending) ───────────────── */}
      {optimisticPick && !voted && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">
              You picked{" "}
              <span className="text-primary">&ldquo;{pickedOption?.text}&rdquo;</span> 👍
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a free account to record your vote — takes 10 seconds.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openLoginPrompt?.()}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Log in
            </button>
            <Link
              href="/register"
              className="flex-1 py-2 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors text-center"
            >
              Sign up free
            </Link>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {totalVotes.toLocaleString()} {totalVotes === 1 ? "person" : "people"} voted so far
          </p>
        </div>
      )}
    </div>
  );
}

