"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle } from "lucide-react";
import ReactionButton from "@components/ReactionButton";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import SharePopup from "@components/SharePopup";
import { getContentStats } from "@components/actions/actions";
import { useStatsBatch } from "@components/providers/StatsBatchProvider";

export default function StatsBar({
  entityType,
  entityId,
  session: sessionProp,
  show = {
    like: true,
    share: true,
    save: true,
    follow: true,
    comment: false,
  },
  onSaveClick,
  onCommentClick,
  commentCount,
  shareUrl,
  initialStats = null,
  knownCounts = null,
  useBatch = true,
}) {
  const openLoginPrompt = useLoginPrompt();
  const batch = useStatsBatch();
  // Prefer the prop for backward-compat; fall back to the client hook so the
  // component works on CDN-cached static pages where no server session exists.
  const { data: hookSession } = useSession();
  const session = sessionProp ?? hookSession;
  const [stats, setStats] = useState(
    initialStats || {
      reactions: { like: knownCounts?.like ?? 0 },
      reactedByUser: { like: false },
      followCount: 0,
      isFollowing: false,
      saveCount: 0,
    }
  );
  const [loading, setLoading] = useState(
    !initialStats && (!!show?.save || !!show?.follow || (session?.user && !!show?.like))
  );
  const resolvedForUserRef = useRef(false);
  const showRef = useRef(show);
  const knownCountsRef = useRef(knownCounts);
  showRef.current = show;
  knownCountsRef.current = knownCounts;

  useEffect(() => {
    if (!entityId) return;
    const hasUser = !!session?.user;

    // Once we have resolved viewer state for a logged-in user, don't re-run.
    // If we previously resolved as a guest and the user just logged in, we
    // must re-run to fetch their actual reaction state.
    if (resolvedForUserRef.current && hasUser) return;
    let ignore = false;

    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    const showCfg = showRef.current;

    async function resolveStats() {
      // Guest users don't need any viewer-state network call.
      if (!hasUser) {
        if (!ignore) setLoading(false);
        return;
      }

      // Try the batched viewer-state provider first.
      if (useBatch && batch) {
        const key = `${entityType}:${entityId}`;
        const cached = batch.getCached(key);
        if (cached) {
          setStats((prev) => ({
            ...prev,
            reactedByUser: { like: showCfg?.like ? cached.like || false : prev?.reactedByUser?.like },
            isFollowing: showCfg?.follow ? cached.follow || false : prev?.isFollowing,
          }));
          if (!ignore) setLoading(false);
          resolvedForUserRef.current = true;
          return;
        }

        try {
          const result = await batch.register(key);
          if (!ignore && result) {
            setStats((prev) => ({
              ...prev,
              reactedByUser: { like: showCfg?.like ? result.like || false : prev?.reactedByUser?.like },
              isFollowing: showCfg?.follow ? result.follow || false : prev?.isFollowing,
            }));
          }
          if (!ignore) setLoading(false);
          resolvedForUserRef.current = true;
          return;
        } catch (err) {
          console.error("[StatsBar] batch register failed:", err);
          // Fall through to per-card fetch.
        }
      }

      // Fallback / single-card path. We already have denormalized counts from
      // the feed model, so this only queries user-specific state.
      try {
        const result = await getContentStats({
          entityType,
          entityId,
          show: showCfg,
          userId,
          userEmail,
          knownCounts: knownCountsRef.current,
        });
        if (!ignore) setStats(result);
      } catch {
        // leave existing/pre-populated stats
      } finally {
        if (!ignore) setLoading(false);
      }
      resolvedForUserRef.current = true;
    }

    resolveStats();

    return () => { ignore = true; };
  }, [entityType, entityId, session?.user?.id, session?.user?.email, useBatch, batch]);

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

      {/* Comment pill (Unified Engagement) */}
      {show.comment && (
        <button
          onClick={onCommentClick}
          aria-label={commentCount > 0 ? `${commentCount} comments` : "Comment"}
          className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-border bg-muted/60 hover:bg-muted text-foreground text-sm font-medium transition leading-none shadow-xs min-h-[34px] sm:min-h-[36px] md:h-9 active:scale-95 touch-manipulation"
        >
          <MessageCircle size={15} />
          {commentCount > 0 && (
            <span className="text-xs sm:text-sm font-semibold tabular-nums">
              {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1).replace(/\.0$/, "")}K` : commentCount}
            </span>
          )}
        </button>
      )}

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
