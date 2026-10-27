/**
 * HomePageContent.js
 * 
 * Client-side wrapper for homepage that handles scroll restoration.
 */

'use client';

import HomepageFeedsWrapper from '@components/HomepageFeedsWrapper';
import CreatePostTeaser from "@components/CreatePostTeaser";

export default function HomePageContent({ initialGlobalFeed, initialGlobalCursor }) {
  return (
    <div className="mx-auto max-w-2xl px-0 py-2 sm:py-6">
      <CreatePostTeaser className="mb-4" />
      {/* Client component that loads multiple feeds with batch optimization */}
      <HomepageFeedsWrapper 
        initialGlobalFeed={initialGlobalFeed}
        initialGlobalCursor={initialGlobalCursor}
      />
    </div>
  );
}
