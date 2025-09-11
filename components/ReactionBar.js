"use client";

import { useState } from "react";
import ReactionButton from "@components/ReactionButton";
import FollowButton   from "@components/FollowButton";

export default function ReactionBar({
  contentId,
  type,                     // e.g. "post" | "review" | "question" | "group"
  initialReactions = {},    // { like: 10, reactedByLike: true }
  initialFollow = false,
  isLoggedIn,
  openLoginPrompt,
  layout = "row",           // "row" or "column"
}) {
  // seed local state from props
  const [likeCount, setLikeCount] = useState(initialReactions.like || 0);
  const [liked, setLiked]     = useState(!!initialReactions.reactedByLike);
  const [following, setFollowing] = useState(initialFollow);

  return (
    <div
      className={`mt-4 ${
        layout === "column"
          ? "flex flex-col gap-3"
          : "flex flex-wrap items-center gap-3"
      }`}
    >
      {/* Only Like reaction */}
      <ReactionButton
        entityType={type}
        entityId={contentId}
        reactionType="like"
        initialCount={likeCount}
        reactedByCurrentUser={liked}
        isLoggedIn={isLoggedIn}
        openLoginPrompt={openLoginPrompt}
        icon="👍"
        label="Like"
        onToggle={(newCount, newState) => {
          setLikeCount(newCount);
          setLiked(newState);
        }}
      />

      {/* Generic Follow */}
      <FollowButton
        entityType={type}
        entityId={contentId}
        initialFollow={following}
        openLoginPrompt={openLoginPrompt}
        onToggle={(next) => setFollowing(next)}
      />
    </div>
  );
}
