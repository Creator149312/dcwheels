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
  showTitle = false 
}) {
  return (
    <div className="space-y-6">
      {/* Main Feed Container */}
      <InfiniteFeedStream 
        initialItems={initialItems}
        initialNextCursor={initialCursor}
        type="global"
      />
    </div>
  );
}
