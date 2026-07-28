/**
 * HomepageFeedsWrapper.js
 * 
 * Simplified wrapper for homepage feed.
 * Removed tabs as per user request to focus on the Global Feed only.
 */

'use client';

import GlobalSpinFeed from '@components/GlobalSpinFeed';

export default function HomepageFeedsWrapper({ 
  initialGlobalFeed = [],
  initialGlobalCursor = null,
}) {
  return (
    <div className="space-y-2 px-0">
      <GlobalSpinFeed 
        initialItems={initialGlobalFeed} 
        initialCursor={initialGlobalCursor}
        showTitle={false} 
      />
    </div>
  );
}
