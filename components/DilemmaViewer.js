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
    // If loading or already voted for this exact option, ignore
    if (loading || (selectedOptionId && String(selectedOptionId) === String(optionId))) return;

    // Haptic feedback on mobile if supported
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      try {
        window.navigator.vibrate(12);
      } catch {}
    }

    // Affinity capture: a vote is a strong fandom signal. Works for guests too
    // (tracked in localStorage — the warm feed personalizes on their next visit).
    trackAffinity(post?.contentRef?.type || "anime", "vote");

    const isChangingVote = voted && selectedOptionId && String(selectedOptionId) !== String(optionId);

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
        toast.success(isChangingVote ? "Vote updated!" : "Vote recorded!");
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
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-background border border-border/70 shadow-md flex items-center justify-center text-[11px] sm:text-xs font-black tracking-wider text-muted-foreground pointer-events-none ring-4 ring-background">
            VS
          </div>
        )}

        {post.pollOptions.map((option, idx) => {
          const optId = String(option._id ?? idx);
          const isSelected = selectedOptionId && String(selectedOptionId) === optId;
          const count = displayCounts[option._id] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const hasImage = !!option.image;

          if (hasImage) {
            return (
              <button
                key={`${postId}-${option._id ?? idx}`}
                onClick={() => handleVote(option._id)}
                disabled={loading || (isSelected && revealBars)}
                className={`relative w-full overflow-hidden rounded-2xl border text-left flex flex-col transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-primary/40 bg-card
                  ${
                    isSelected
                      ? "border-primary shadow-xs ring-1 ring-primary/30"
                      : "border-border/60 hover:border-border hover:shadow-xs active:scale-[0.985] cursor-pointer"
                  }
                  ${loading ? "opacity-70 cursor-not-allowed" : ""}
                `}
              >
                {/* Threads-style Image Hero: clean 4:3 or 16:10 container showing the full image */}
                <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-muted/40 overflow-hidden shrink-0">
                  <img
                    src={option.imageVariants?.md || option.imageVariants?.sm || option.image}
                    srcSet={
                      option.imageVariants
                        ? `${option.imageVariants.sm} 240w, ${option.imageVariants.md} 480w`
                        : undefined
                    }
                    sizes="(max-width: 640px) 50vw, 360px"
                    alt={option.text}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    decoding="async"
                  />

                  {/* Voted check indicator pill on the image top-left */}
                  {revealBars && isSelected && (
                    <div className="absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-white text-[10px] font-bold tracking-wide border border-white/10 shadow-xs">
                      <span>Your vote</span>
                    </div>
                  )}
                </div>

                {/* Option text + percentage bar below the image */}
                <div className="relative p-2.5 sm:p-3 flex-1 flex flex-col justify-between min-w-0 overflow-hidden">
                  <p className="text-[13px] sm:text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1.5">
                    {option.text}
                  </p>

                  {/* Voting results progress bar */}
                  {revealBars ? (
                    <div className="mt-auto space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isSelected ? "bg-primary" : "bg-muted-foreground/40"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5 font-medium">
                        <span>{percentage}%</span>
                        <span>{count.toLocaleString()} {count === 1 ? "vote" : "votes"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto pt-0.5">
                      <span className="text-[11px] text-muted-foreground/60 font-medium group-hover:text-primary transition-colors">
                        Tap to vote
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          }

          // Text-only poll option (standard row / card)
          return (
            <button
              key={`${postId}-${option._id ?? idx}`}
              onClick={() => handleVote(option._id)}
              disabled={loading || (isSelected && revealBars)}
              className={`relative w-full overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-primary/15 text-left
                ${
                  isTwoOptions
                    ? "min-h-[84px] sm:min-h-[110px] p-3 sm:p-4 flex flex-col justify-between bg-card"
                    : "min-h-[48px] sm:min-h-[56px] px-3.5 py-3 sm:p-4 flex items-center justify-between bg-card"
                }
                ${
                  isSelected
                    ? "border-primary shadow-sm ring-2 ring-primary/20"
                    : "border-border hover:border-primary/60 hover:shadow-md hover:bg-primary/[0.02] active:scale-[0.98] cursor-pointer"
                }
                ${loading ? "opacity-70 cursor-not-allowed" : ""}
              `}
            >
              {isTwoOptions ? (
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

              {/* Vote result progress fill for text option */}
              {revealBars && (
                <div
                  className="absolute inset-0 transition-all duration-700 ease-out bg-primary/10 dark:bg-primary/20"
                  style={{ width: `${percentage}%` }}
                />
              )}

              {/* Percentage & Vote Count Badge (after reveal) */}
              {revealBars && (
                <div
                  className={`z-20 flex items-center gap-2 ${
                    isTwoOptions
                      ? "relative z-10 justify-between border-t border-border/60 mt-2 pt-1"
                      : "relative z-10 shrink-0 justify-end"
                  }`}
                >
                  {isSelected && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Your vote
                    </span>
                  )}
                  <span className="font-black text-xs sm:text-sm text-primary">
                    {percentage}%
                  </span>
                  {isTwoOptions && (
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
          postId={postId || post?._id || post?.id}
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

