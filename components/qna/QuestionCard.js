"use client";

import { useState } from "react";
// ReactionButton + CommentsPanel commented out — reinstating once there's
// enough community activity to make likes/comments valuable.
// import ReactionButton from "@components/ReactionButton";
// import CommentsPanel from "@components/comments/CommentsPanel";

export default function QuestionCard({
  data,
  isLoggedIn,
  openLoginPrompt,
  currentUserId,
  onUpdated,
}) {
  const [state]                           = useState(data);
  const [voteCounts, setVoteCounts]       = useState(state.voteCounts || []);
  const [userVoteIndex, setUserVoteIndex] = useState(state.userVoteIndex ?? null);
  const [loadingVote, setLoadingVote]     = useState(false);

  const totalVotes  = voteCounts.reduce((sum, c) => sum + c, 0);
  const percentages = voteCounts.map((c) =>
    totalVotes ? Math.round((c / totalVotes) * 100) : 0
  );

  const handleVote = async (optionIndex) => {
    if (!isLoggedIn) return openLoginPrompt?.();
    if (loadingVote) return;

    setLoadingVote(true);
    try {
      const res = await fetch(`/api/questions/${state._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", optionIndex }),
      });
      if (!res.ok) throw new Error("Vote failed");
      const result = await res.json();

      setUserVoteIndex(optionIndex);
      if (result.voteCounts) {
        setVoteCounts(result.voteCounts);
      } else {
        const updated = [...voteCounts];
        if (userVoteIndex !== null) {
          updated[userVoteIndex] = Math.max(0, updated[userVoteIndex] - 1);
        }
        updated[optionIndex] = (updated[optionIndex] || 0) + 1;
        setVoteCounts(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVote(false);
    }
  };

  return (
    <div className="flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
            {state.text}
          </p>
          {totalVotes > 0 && (
            <span className="flex-shrink-0 text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {(state.type === "yesno" || state.type === "multi") && (
          <div className="space-y-2">
            {state.options.map((opt, idx) => {
              const pct     = percentages[idx] || 0;
              const isVoted = userVoteIndex === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleVote(idx)}
                  disabled={loadingVote}
                  className={`relative w-full text-left px-3 py-2 rounded-xl border text-sm font-medium overflow-hidden transition-all duration-150
                    ${isVoted
                      ? "border-blue-500 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                    }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 rounded-xl transition-all duration-500
                      ${isVoted ? "bg-blue-100 dark:bg-blue-900/40" : "bg-gray-100 dark:bg-gray-800/60"}`}
                    style={{ width: totalVotes ? `${pct}%` : "0%" }}
                  />
                  <span className="relative z-10 flex justify-between items-center">
                    <span className={isVoted ? "text-blue-700 dark:text-blue-300" : "text-gray-700 dark:text-gray-200"}>
                      {opt}
                    </span>
                    {totalVotes > 0 && (
                      <span className={`text-xs ${isVoted ? "text-blue-500 font-semibold" : "text-gray-400"}`}>
                        {pct}%
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {totalVotes === 0 && userVoteIndex === null && (
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 italic">Be the first to vote!</p>
        )}
      </div>
    </div>
  );
}