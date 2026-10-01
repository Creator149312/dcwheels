"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import { trackAffinity } from "@utils/affinity";
import toast from "react-hot-toast";
import Link from "next/link";

/**
 * DilemmaViewer — displays a post's poll options as clickable dilemma cards
 *
 * Hybrid voting flow:
 * - Anonymous user clicks → bars reveal immediately (optimistic +1), signup nudge appears
 * - Logged-in user clicks → API call, vote persisted
 */
export default function DilemmaViewer({ post, postId }) {
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
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

    // Affinity capture: a vote is a strong fandom signal. Works for guests too
    // (tracked in localStorage — the warm feed personalizes on their next visit).
    trackAffinity(post?.contentRef?.type || "anime", "vote");

    // Anonymous: show optimistic result + nudge, don't hit the API yet
    if (!session?.user) {
      setOptimisticPick(optionId);
      return;
    }

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
        setVoted(true);
        toast.success("Vote recorded!");
      } else if (res.status === 409) {
        setVoted(true);
        toast("You already voted on this poll");
      } else {
        throw new Error("Failed to vote");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickedOption = post.pollOptions.find((o) => o._id === optimisticPick);
  const isTwoOptions = post.pollOptions.length === 2;

  return (
    <div className="space-y-3">
      {/* ── Unified Poll Options Grid ──────────────────────────────────────── */}
      <div
        className={`relative grid gap-2.5 ${
          post.pollOptions.length === 2
            ? "grid-cols-2"
            : post.pollOptions.length <= 4
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3"
        }`}
      >
        {/* Central "VS" badge for 2-option comparisons */}
        {isTwoOptions && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-card border-2 border-primary/30 shadow-lg flex items-center justify-center text-xs sm:text-sm font-black tracking-wider text-primary pointer-events-none ring-4 ring-background">
            VS
          </div>
        )}

        {post.pollOptions.map((option, idx) => {
          const count = displayCounts[option._id] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const hasImage = !!option.image;

          return (
            <button
              key={`${postId}-${option._id ?? idx}`}
              onClick={() => handleVote(option._id)}
              disabled={revealBars || loading}
              className={`relative w-full overflow-hidden rounded-2xl border transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-primary/15 text-left
                ${hasImage ? "aspect-square bg-muted" : "min-h-[96px] sm:min-h-[110px] p-4 flex flex-col justify-between bg-card"}
                ${
                  !revealBars
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
              ) : (
                /* Text-only option content */
                <div className="relative z-10 flex-1 flex items-center pr-1">
                  <span className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-3">
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
                <div className={`relative z-10 flex items-center justify-between gap-1 mt-2 pt-1 border-t ${
                  hasImage ? "border-white/10 absolute top-2 right-2 m-0 p-0 border-none" : "border-border/60"
                }`}>
                  <span
                    className={`font-black text-xs sm:text-sm ${
                      hasImage
                        ? "bg-black/75 text-white px-2 py-0.5 rounded-md backdrop-blur-sm"
                        : "text-primary"
                    }`}
                  >
                    {percentage}%
                  </span>
                  {!hasImage && (
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
        <p className="text-center text-xs text-muted-foreground pt-1">
          ✓ Vote recorded — {totalVotes.toLocaleString()}{" "}
          {totalVotes === 1 ? "person has" : "people have"} voted
        </p>
      )}

      {/* ── Anonymous nudge ───────────────────────────────────────────────── */}
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

