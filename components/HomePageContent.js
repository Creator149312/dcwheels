/**
 * HomePageContent.js
 * 
 * Client-side wrapper for homepage that handles scroll restoration.
 */

'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import HomepageFeedsWrapper from '@components/HomepageFeedsWrapper';
import CreatePostTeaser from "@components/CreatePostTeaser";

export default function HomePageContent({ initialGlobalFeed, initialGlobalCursor }) {
  // Restore scroll position when navigating back
  useScrollRestoration();

  return (
    <div className="mx-auto max-w-3xl px-0 sm:px-4 py-4 sm:py-8">
      <div className="px-4 sm:px-0">
        <CreatePostTeaser className="mb-6" />
      </div>
      {/* Client component that loads multiple feeds with batch optimization */}
      <HomepageFeedsWrapper 
        initialGlobalFeed={initialGlobalFeed}
        initialGlobalCursor={initialGlobalCursor}
      />
    </div>
  );
}
