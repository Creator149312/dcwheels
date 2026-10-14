"use client";

import CreatePostTeaser from "@components/CreatePostTeaser";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

export default function CategoryCommunityFeed({
  type,
  initialFeedItems = [],
  initialFeedCursor = null,
  activeTag = null,
  hideComposer = false,
}) {
  return (
    <div className="w-full">
      {/* 1. In-Feed Composer Contextually Pre-tagged with the Category */}
      {!hideComposer && (
        <div className="mb-4">
          <CreatePostTeaser
            defaultTag={activeTag || type}
            className="shadow-sm"
          />
        </div>
      )}

      {/* 2. Infinite Stream of Posts, Wheels, and Lists for this Category */}
      <InfiniteFeedStream
        type={type}
        tag={activeTag || null}
        docType="post,wheel,list"
        initialItems={initialFeedItems}
        initialNextCursor={initialFeedCursor}
      />
    </div>
  );
}
