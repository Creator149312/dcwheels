"use client";

import Link from "next/link";
import { timeAgo } from "@utils/HelperFunctions";
import { getWheelUrl } from "@utils/UrlHandler";

// ── Single decision card (timeline style) ─────────────────────────────────
export function DecisionTimelineItem({ item }) {
  const wheelRoute =
    item.wheelId && item.wheelId !== "home"
      ? getWheelUrl({ _id: item.wheelId, slug: item.wheelSlug })
      : "/";

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
        <DecisionTimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
}
