"use client";

import ReactionButton from "@components/ReactionButton";
import FollowButton from "@components/FollowButton";
import { useLoginPrompt } from "@app/LoginPromptProvider";

export default function StatsBar({
  entityType = "topicpage",
  entityId,
  stats,
  session,
}) {
  if (!entityId || !stats) return null;
  
  const openLoginPrompt = useLoginPrompt();

  return (
    <div className="reactions flex items-center gap-3">
      <ReactionButton
        entityType={entityType}
        entityId={entityId}
        reactionType="like"
        initialCount={stats.reactions?.like || 0}
        reactedByCurrentUser={stats.reactedByUser?.like || false}
        isLoggedIn={!!session}
        openLoginPrompt={openLoginPrompt}
      />

      <FollowButton
        entityType={entityType}
        entityId={entityId}
        initialFollow={stats.isFollowing}
        initialCount={stats.followCount}
        openLoginPrompt={openLoginPrompt}
      />
    </div>
  );
}
