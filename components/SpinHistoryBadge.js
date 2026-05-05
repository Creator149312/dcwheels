"use client";
/**
 * SpinHistoryBadge
 * ────────────────
 * Shows a contextual "You spun to this from [Wheel] on [date]" banner on
 * a content slug page when the authenticated user has previously landed on
 * this item as a spin result. Renders nothing for guests or if no match.
 *
 * Props
 *   result — the display title of the content item (matched against DecisionLog.result)
 */
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function SpinHistoryBadge({ result }) {
  const { status } = useSession();
  const [log, setLog] = useState(null);

  useEffect(() => {
    if (status !== "authenticated" || !result) return;
    fetch(`/api/decisionlog/by-result?result=${encodeURIComponent(result)}`)
      .then((r) => r.json())
      .then((d) => { if (d.found) setLog(d); })
      .catch(() => {}); // silent — badge is non-critical
  }, [status, result]);

  if (!log) return null;

  const date = new Date(log.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5
                    bg-blue-50 dark:bg-blue-950/40
                    border border-blue-100 dark:border-blue-800/40
                    rounded-xl text-sm text-blue-800 dark:text-blue-300">
      <span aria-hidden="true" className="flex-shrink-0 text-base">🎡</span>
      <span>
        You spun to this from{" "}
        <a
          href={`/uwheels/${log.wheelId}`}
          className="font-semibold underline underline-offset-2 hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
        >
          {log.wheelTitle || "a wheel"}
        </a>
        {" "}on {date}
      </span>
    </div>
  );
}
