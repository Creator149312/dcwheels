/**
 * useScrollRestoration.js
 *
 * Restores scroll position ONLY when the user navigates back/forward
 * to a page (e.g. browser back button). Normal link clicks keep Next.js'
 * default scroll-to-top behaviour.
 *
 * Why this matters:
 *  - Restoring on every pathname change makes new pages open at the
 *    previous page's scroll offset, which feels broken.
 *  - Writing to sessionStorage on every scroll event causes jank on
 *    long feeds.
 *
 * Usage:
 * 'use client';
 * import { useScrollRestoration } from '@/hooks/useScrollRestoration';
 *
 * export default function MyPage() {
 *   useScrollRestoration();
 *   return <div>...</div>;
 * }
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'scroll-positions-v1';

function readPositions() {
  if (typeof window === 'undefined' || !window.sessionStorage) return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePositions(positions) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Ignore quota/security errors.
  }
}

export function useScrollRestoration() {
  const pathname = usePathname();
  const isPopStateRef = useRef(false);
  const latestScrollYRef = useRef(0);

  // Track live scroll position passively so we can save the exact scrollY
  // of the previous route before the browser/router resets scroll on navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    latestScrollYRef.current = window.scrollY;

    const onScroll = () => {
      latestScrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  // Detect back/forward navigation. The popstate event fires before React
  // re-renders the new route, so by the time the pathname effect runs the
  // flag is already true.
  useEffect(() => {
    const onPopState = () => {
      isPopStateRef.current = true;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Restore scroll position only after a back/forward navigation.
  // Normal <Link> navigations explicitly scroll to the top so long feeds
  // or Suspense boundaries never leave the new page scrolled down.
  useEffect(() => {
    if (!isPopStateRef.current) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }
    isPopStateRef.current = false;

    const positions = readPositions();
    const saved = positions[pathname];

    if (typeof saved === 'number' && saved > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: 'auto' });
      });
    }
  }, [pathname]);

  // Save the scroll position for this pathname when the component unmounts
  // or the pathname changes. We read from latestScrollYRef so we don't save
  // the new route's scroll offset by mistake.
  useEffect(() => {
    return () => {
      const positions = readPositions();
      positions[pathname] = latestScrollYRef.current;
      writePositions(positions);
    };
  }, [pathname]);
}

export default useScrollRestoration;
