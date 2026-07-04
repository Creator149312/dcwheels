"use client";

import { Activity } from "lucide-react";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

/**
 * GlobalSpinFeed — public global activity feed.
 * Thin wrapper around InfiniteFeedStream for specific homepage styling.
 */
export default function GlobalSpinFeed({ 
  initialItems = [], 
  initialCursor = null,
  showTitle = true 
}) {
  return (
    <div className="space-y-6">
      {showTitle && (
        <div className="flex items-center gap-2 mb-4 px-2">
          <Activity className="h-5 w-5 text-[#f6b435]" />
          <h2 className="text-xl font-black text-[#1e1e24] uppercase tracking-tight dark:text-gray-100">
            Global Activity
          </h2>
        </div>
      )}

      {/* Main Feed Container */}
      <InfiniteFeedStream 
        initialItems={initialItems}
        initialNextCursor={initialCursor}
        type="global"
      />
    </div>
  );
}
