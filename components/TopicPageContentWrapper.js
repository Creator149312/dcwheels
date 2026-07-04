/**
 * TopicPageContentWrapper.js
 * 
 * Client-side wrapper for topic pages that handles scroll restoration.
 * Wraps the server-rendered TopicPageLayout component.
 */

'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';

export default function TopicPageContentWrapper({ children }) {
  // Restore scroll position when navigating back
  useScrollRestoration();

  return children;
}
