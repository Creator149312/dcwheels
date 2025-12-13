"use client";

import { useEffect, useState } from "react";
import ReactionButton from "@components/ReactionButton";
import FollowButton from "@components/FollowButton";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import SharePopup from "@components/SharePopup";
import { getContentStats } from "@components/actions/actions"; // Ensure this is client-safe

export default function StatsBar({
  entityType,
  entityId,
  session,
  show = {
    like: true,
    share: true,
    save: true,
    follow: true,
  },
  onCommentClick,
  onShareClick,
  onSaveClick,
}) {
  const openLoginPrompt = useLoginPrompt();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const result = await getContentStats({ entityType, entityId, show });
        setStats(result);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    }

    if (entityId) fetchStats();
  }, [entityType, entityId]);

  if (!entityId) return null;

  return (
    <div className="stats-bar flex items-center gap-2 md:gap-4 text-sm">
      {/* Loading Placeholder */}
      {loading && (
        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      )}

      {/* Loaded Stats */}
      {!loading && stats && (
        <>
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

          {show.share && <SharePopup variant="buttoned"/>}

          {show.save && (
            <button
              onClick={onSaveClick}
              className="flex items-center gap-1 hover:underline"
            >
              📌 {stats.saveCount || 0}
            </button>
          )}

          {show.follow && (
            <FollowButton
              entityType={entityType}
              entityId={entityId}
              initialFollow={stats.isFollowing}
              initialCount={stats.followCount}
              openLoginPrompt={openLoginPrompt}
            />
          )}
        </>
      )}
    </div>
  );
}
