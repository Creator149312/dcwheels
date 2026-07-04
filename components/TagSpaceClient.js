"use client";

import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

export default function TagSpaceClient({ tagId, initialItems = [], initialNextCursor = null }) {
  return (
    <div className="space-y-4">
      <InfiniteFeedStream 
        tag={tagId}
        initialItems={initialItems}
        initialNextCursor={initialNextCursor}
      />
    </div>
  );
}
