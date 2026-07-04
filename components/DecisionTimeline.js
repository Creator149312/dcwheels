"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { timeAgo } from "@utils/HelperFunctions";

// ── Decision status config ────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { label: "Pending",  emoji: "⏳", cls: "bg-muted text-muted-foreground hover:border-border" },
  done:    { label: "Done",     emoji: "✅", cls: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:border-green-400" },
  dropped: { label: "Dropped",  emoji: "❌", cls: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:border-red-400" },
};
const STATUS_CYCLE = { pending: "done", done: "dropped", dropped: "pending" };

// ── Single decision card (timeline style, with status badge) ──────────────
export function DecisionTimelineItem({ item, isOwner }) {
  const [status, setStatus] = useState(item.status || "pending");
  const [updating, setUpdating] = useState(false);

  const wheelRoute =
    item.wheelId && item.wheelId !== "home"
      ? item.wheelId.length === 24
        ? `/uwheels/${item.wheelId}`
        : `/wheels/${item.wheelId}`
      : "/";

  async function cycleStatus(e) {
    e.preventDefault();
    if (!isOwner || updating) return;
    const next = STATUS_CYCLE[status] || "pending";
    setStatus(next); // optimistic
    setUpdating(true);
    try {
      const res = await fetch(`/api/decision-log/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) setStatus(status); // rollback
    } catch {
      setStatus(status);
    } finally {
      setUpdating(false);
    }
  }

  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="relative sm:pl-10">
      {/* Timeline dot */}
      <div className="hidden sm:flex absolute left-4 top-1.5 -ml-[5px] h-3 w-3 rounded-full border-2 border-primary bg-background shadow-sm shadow-primary/20" />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
        {/* Card header */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 bg-primary/10 text-primary">
              🎯 Spin Result
            </span>
            <button
              onClick={cycleStatus}
              disabled={!isOwner || updating}
              title={isOwner ? "Click to cycle status: Pending → Done → Dropped" : ""}
              className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 border border-transparent transition-colors disabled:opacity-50 ${cfg.cls} ${!isOwner ? "cursor-default" : ""}`}
            >
              {cfg.emoji} {cfg.label}
            </button>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.createdAt)}</span>
        </div>

        {/* Card body */}
        <p className="text-sm text-foreground">
          Spun{" "}
          <Link href={wheelRoute} className="font-medium text-primary hover:underline">
            {item.wheelTitle || "a wheel"}
          </Link>{" "}
          and got{" "}
          <span className="font-bold text-gray-900 dark:text-white bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-md">
            {item.result}
          </span>
        </p>

        {item.resultImage && (
          <div className="mt-2.5 w-full h-32 relative rounded-lg overflow-hidden border border-border bg-muted">
            <img src={item.resultImage} alt={item.result} className="w-full h-full object-contain" />
          </div>
        )}

        {item.note && (
          <p className="mt-2 text-sm text-muted-foreground border-l-[3px] border-primary/30 pl-3 italic">
            &quot;{item.note}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

// ── Decision timeline wrapper (expand/collapse) ────────────────────────────
export function DecisionTimeline({ decisions, isOwner }) {
  if (!decisions?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        No decisions made yet. Spin a wheel to get started!
      </p>
    );
  }

  return (
    <div className="relative space-y-4">
      <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gradient-to-b from-primary/30 via-border to-transparent hidden sm:block" />
      {decisions.map((item) => (
        <DecisionTimelineItem key={item._id} item={item} isOwner={isOwner} />
      ))}
    </div>
  );
}
