"use client";

import CreatePostTeaser from "@components/CreatePostTeaser";
import InfiniteFeedStream from "@components/feed/InfiniteFeedStream";

export default function CategoryCommunityFeed({
  type,
  initialFeedItems = [],
  initialFeedCursor = null,
  activeTag = null,
}) {
  return (
    <div className="w-full">
      {/* 1. In-Feed Composer Contextually Pre-tagged with the Category */}
      <div className="mb-4">
        <CreatePostTeaser
          defaultTag={activeTag || type}
          className="shadow-sm"
        />
      </div>

      {/* 2. Infinite Stream of Posts and Wheels for this Category */}
      <InfiniteFeedStream
        type={type}
        tag={activeTag || null}
        docType="post,wheel"
        initialItems={initialFeedItems}
        initialNextCursor={initialFeedCursor}
      />
    </div>
  );
}
