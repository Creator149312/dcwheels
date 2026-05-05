"use client";
/**
 * DoneNudge
 * ─────────
 * When the authenticated user's list status for this entity is "done",
 * renders a small callout above WorthItVote nudging them to cast their vote.
 * Renders nothing for guests, unauthenticated users, or non-done statuses.
 *
 * Props
 *   entityId — MongoDB ObjectId string of the TopicPage document
 */
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function DoneNudge({ entityId }) {
  const { status } = useSession();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || !entityId) return;
    fetch(`/api/unifiedlist/by-entity?entityId=${entityId}`)
      .then((r) => r.json())
      .then((d) => { if (d.found && d.status === "done") setShow(true); })
      .catch(() => {}); // silent — nudge is non-critical
  }, [status, entityId]);

  if (!show) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-3
                    bg-green-50 dark:bg-green-900/20
                    border border-green-200 dark:border-green-800/40
                    rounded-xl">
      <span aria-hidden="true" className="text-xl flex-shrink-0">✅</span>
      <p className="text-sm text-green-800 dark:text-green-200 font-medium leading-snug">
        You marked this as done! Was it worth it? Cast your vote below.
      </p>
    </div>
  );
}
