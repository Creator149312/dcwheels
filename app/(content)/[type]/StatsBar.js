"use client";

import ReactionButton from "@components/ReactionButton";
import FollowButton from "@components/FollowButton";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import SharePopup from "@components/SharePopup";

export default function StatsBar({
  entityType,
  entityId,
  stats,
  session,
  // Control which buttons to show
  show = {
    like: true,
    share: true,
    save: false,
    follow: true,
  },
  onCommentClick,
  onShareClick,
  onSaveClick,
}) {
  const openLoginPrompt = useLoginPrompt();
  if (!entityId || !stats) return null;

  return (
    <div className="stats-bar flex items-center gap-2 md:gap-4 text-sm">
      {/* Like / Reaction */}
      {show.like && (
        <ReactionButton
          entityType={entityType}
          entityId={entityId}
          reactionType="like"
          initialCount={stats.reactions?.like || 0}
          reactedByCurrentUser={stats.reactedByUser?.like || false}
          isLoggedIn={!!session}
          openLoginPrompt={openLoginPrompt}
        />
      )}

      {/* Shares */}
      {show.share && (
       <SharePopup />
      )}

      {/* Saves */}
      {show.save && (
        <button
          onClick={onSaveClick}
          className="flex items-center gap-1 hover:underline"
        >
          📌 {stats.saveCount || 0}
        </button>
      )}

      {/* Follow */}
      {show.follow && (
        <FollowButton
          entityType={entityType}
          entityId={entityId}
          initialFollow={stats.isFollowing}
          initialCount={stats.followCount}
          openLoginPrompt={openLoginPrompt}
        />
      )}
    </div>
  );
}
