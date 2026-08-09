"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useLoginPrompt } from "@app/LoginPromptProvider";
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

  const hasImageOptions = post.pollOptions.some((o) => o.image);

  return (
    <div className="space-y-3">
      {/* ── Image-grid poll ──────────────────────────────────────────────── */}
      {hasImageOptions && (
        <div className={`relative grid gap-2 ${post.pollOptions.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
          {post.pollOptions.length === 2 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-background border-2 border-primary/20 shadow-lg flex items-center justify-center text-[11px] sm:text-xs font-black tracking-wider text-primary pointer-events-none">
              VS
            </div>
          )}
          {post.pollOptions.map((option, idx) => {
            const count = displayCounts[option._id] || 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

            return (
              <button
                key={`${postId}-${option._id ?? idx}`}
                onClick={() => handleVote(option._id)}
                disabled={revealBars || loading}
                className={`relative w-full overflow-hidden rounded-xl border border-border bg-muted transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-primary/10
                  ${option.image ? "aspect-square" : "aspect-[4/3]"}
                  ${!revealBars ? "hover:border-primary/60 hover:shadow-md active:scale-[0.99]" : "cursor-default"}
                  disabled:cursor-not-allowed
                `}
              >
                {option.image ? (
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
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <span className="text-sm font-semibold text-foreground text-center line-clamp-3">
                      {option.text}
                    </span>
                  </div>
                )}

                {/* Result overlay */}
                {revealBars && (
                  <div
                    className="absolute inset-0 bg-primary/20 transition-all duration-700 ease-out"
                    style={{ opacity: Math.max(0.15, percentage / 100) }}
                  />
                )}

                {/* Caption gradient */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-3">
                  <p className="text-white font-bold text-sm text-left line-clamp-2">
                    {option.text}
                  </p>
                </div>

                {revealBars && (
                  <span className="absolute top-2 right-2 bg-black/70 text-white text-sm font-black px-2 py-0.5 rounded-md">
                    {percentage}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Standard text poll (no images) ──────────────────────────────── */}
      {!hasImageOptions && (
        <div className="flex flex-col gap-2.5 relative">
          {post.pollOptions.map((option, idx) => {
            const count = displayCounts[option._id] || 0;
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

            const unvotedClass =
              "bg-card border border-border hover:border-primary/50 hover:bg-primary/[0.02] active:scale-[0.99] focus:ring-primary/10";

            return (
              <button
                key={`${postId}-${option._id ?? idx}`}
                onClick={() => handleVote(option._id)}
                disabled={revealBars || loading}
                className={`relative w-full flex items-center gap-4 px-5 rounded-2xl border-solid transition-all duration-300
                  disabled:cursor-not-allowed group focus:outline-none focus:ring-4 py-3.5 sm:py-4
                  ${!revealBars ? unvotedClass : "bg-muted/30 border border-border/80 cursor-default"}
                `}
              >
                {/* Background fill bar */}
                {revealBars && (
                  <div
                    className="absolute inset-y-0 left-0 transition-all duration-700 ease-out bg-primary/10 dark:bg-primary/20"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                {option.image && (
                  <img
                    src={option.imageVariants?.sm || option.image}
                    alt=""
                    width={40}
                    height={40}
                    className="relative z-10 w-10 h-10 rounded-lg object-cover border border-border shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                )}

                <span className="relative z-10 leading-snug break-words pr-2 flex-1 text-left text-sm sm:text-base font-bold text-foreground">
                  {option.text}
                </span>

                {revealBars && (
                  <span className="relative z-10 shrink-0 text-sm sm:text-base font-black text-foreground">
                    {percentage}%
                  </span>
                )}
              </button>
            );
          })}

          {/* OR badge for 2-option text polls before voting */}
          {!revealBars && post.pollOptions.length === 2 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-background border border-border/80 shadow-md flex items-center justify-center text-[10px] font-black tracking-wider text-muted-foreground pointer-events-none">
              OR
            </div>
          )}
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

