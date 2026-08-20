"use client";

import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

/**
 * ListsFeed — dedicated paginated feed for /lists.
 * Reuses InfiniteFeedStream with docType="list" so the UX is identical to
 * the global feed, but every item is rendered as a ListShelf.
 */
export default function ListsFeed({ initialItems = [], initialCursor = null }) {
  return (
    <div className="space-y-6">
      <InfiniteFeedStream
        initialItems={initialItems}
        initialNextCursor={initialCursor}
        docType="list"
      />
    </div>
  );
}
