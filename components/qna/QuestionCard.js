"use client";

import { useState } from "react";
import ReactionButton from "@components/ReactionButton";
import CommentsPanel from "@components/comments/CommentsPanel";

export default function QuestionCard({
  data,
  isLoggedIn,
  openLoginPrompt,
  currentUserId,
  onUpdated,
}) {
  const [state, setState] = useState(data);
  const [voteCounts, setVoteCounts] = useState(state.voteCounts || []);
  const [userVoteIndex, setUserVoteIndex] = useState(
    state.userVoteIndex ?? null
  );
  const [loadingVote, setLoadingVote] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);
  const percentages = voteCounts.map((count) =>
    totalVotes ? Math.round((count / totalVotes) * 100) : 0
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

  const toggleComments = () => {
    setShowComments((prev) => {
      const next = !prev;
      if (next && !commentsLoaded) setCommentsLoaded(true);
      return next;
    });
  };

  return (
    <div className="border rounded-md p-4 bg-white dark:bg-gray-900">
      {/* Question header with vote count */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-semibold">{state.text}</div>
        {(state.type === "yesno" || state.type === "multi") && (
          <div className="text-xs font-semibold  px-2 py-0.5 rounded-md">
             {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Voting Section */}
      {(state.type === "yesno" || state.type === "multi") && (
        <div className="space-y-2 mb-3">
          {state.options.map((opt, idx) => {
            const pct = percentages[idx] || 0;
            return (
              <button
                key={idx}
                onClick={() => handleVote(idx)}
                className={`relative w-full text-left px-3 py-2 rounded-md border overflow-hidden transition ${
                  userVoteIndex === idx
                    ? "border-blue-600 bg-blue-50"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
                style={{
                  background: `linear-gradient(to right, rgba(59,130,246,0.2) ${pct}%, transparent ${pct}%)`,
                }}
              >
                <div className="flex justify-between relative z-10">
                  <span>{opt}</span>
                  <span className="text-xs">{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Reaction + Comment Toggle */}
      <div className="flex gap-4 text-xs mt-2 items-center">
        <ReactionButton
          entityType="question"
          entityId={state._id}
          reactionType="like"
          initialCount={state.likesCount || 0}
          reactedByCurrentUser={state.likedByCurrentUser || false}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
        />
        <button
          onClick={toggleComments}
          className="text-gray-600 hover:text-blue-600"
        >
          💬 {showComments ? "Hide" : "View"} Comments
          {typeof state.commentCount === "number" && (
            <span className="ml-1 text-gray-500">({state.commentCount})</span>
          )}
        </button>
      </div>

      {/* Comments Panel */}
      <div className={`mt-3 ${showComments ? "" : "hidden"}`}>
        <CommentsPanel
          entityType="question"
          entityId={state._id}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
          visible={showComments} // NEW
        />
      </div>
    </div>
  );
}
