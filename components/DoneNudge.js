"use client";
/**
 * DoneNudge
 * ─────────
 * When the authenticated user's entity status is "done",
 * renders a small callout above WorthItVote nudging them to cast their vote.
 * Renders nothing for guests, unauthenticated users, or non-done statuses.
 */
import { useEntityTracking } from "@components/EntityTrackingProvider";

export default function DoneNudge() {
  const ctx = useEntityTracking();
  const statusData = ctx?.statusData;

  if (statusData?.status !== "done") return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 mb-2
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
