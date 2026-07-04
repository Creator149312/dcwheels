"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReactionButton from "@components/ReactionButton";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import SharePopup from "@components/SharePopup";
import { getContentStats } from "@components/actions/actions";

export default function StatsBar({
  entityType,
  entityId,
  session: sessionProp,
  show = {
    like: true,
    share: true,
    save: true,
    follow: true,
  },
  onSaveClick,
  shareUrl,
  initialStats = null,
}) {
  const openLoginPrompt = useLoginPrompt();
  // Prefer the prop for backward-compat; fall back to the client hook so the
  // component works on CDN-cached static pages where no server session exists.
  const { data: hookSession } = useSession();
  const session = sessionProp ?? hookSession;
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(!initialStats);

  useEffect(() => {
    if (!entityId) return;
    let ignore = false;

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;

    getContentStats({
      entityType,
      entityId,
      show,
      userId,
      userEmail,
    })
      .then((result) => { if (!ignore) setStats(result); })
      .catch(() => {})
      .finally(() => { if (!ignore) setLoading(false); });

    return () => { ignore = true; };
  }, [entityType, entityId, session?.user, show]);

  if (!entityId) return null;

  // YouTube-style skeleton: pill shapes that match final buttons
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-9 w-20 bg-muted rounded-full animate-pulse" />
        <div className="h-9 w-20 bg-muted rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Like pill */}
      {show.like && stats && (
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

      {/* Share pill */}
      {show.share && <SharePopup variant="buttoned" url={shareUrl} />}

      {/* Save pill */}
      {show.save && (
        <button
          onClick={onSaveClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-muted hover:bg-accent text-foreground text-sm font-medium transition"
        >
          📌 {stats?.saveCount || 0}
        </button>
      )}
    </div>
  );
}
