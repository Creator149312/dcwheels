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

  return (
    <div className="space-y-3">
      {/* ── Poll option cards ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 relative">
        {post.pollOptions.map((option, idx) => {
          const count = displayCounts[option._id] || 0;
          const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const isTwoOptions = post.pollOptions.length === 2;

          let unvotedClass = "";
          let fillBarClass = "";
          let textClass = "";

          fillBarClass = "bg-primary/10 dark:bg-primary/20";
          unvotedClass =
            "bg-card border border-border hover:border-primary/50 hover:bg-primary/[0.02] active:scale-[0.99] focus:ring-primary/10";
          textClass = "text-sm sm:text-base font-bold text-foreground";

          const paddingClass = "py-3.5 sm:py-4";

          return (
            <button
              key={`${postId}-${option._id ?? idx}`}
              onClick={() => handleVote(option._id)}
              disabled={revealBars || loading}
              className={`relative w-full flex items-center justify-between gap-4 px-5 rounded-2xl border-solid transition-all duration-300
                disabled:cursor-not-allowed group focus:outline-none focus:ring-4 ${paddingClass}
                ${!revealBars ? unvotedClass : "bg-muted/30 border border-border/80 cursor-default"}
              `}
            >
              {/* Background fill bar */}
              {revealBars && (
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${fillBarClass}`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <span className={`relative z-10 leading-snug break-words pr-2 max-w-[85%] ${textClass}`}>
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

        {/* OR badge for 2-option polls before voting */}
        {!revealBars && post.pollOptions.length === 2 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-background border border-border/80 shadow-md flex items-center justify-center text-[10px] font-black tracking-wider text-muted-foreground pointer-events-none">
            OR
          </div>
        )}
      </div>

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

