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
  // Normal <Link> navigations rely on Next.js to scroll to the top.
  useEffect(() => {
    if (!isPopStateRef.current) return;
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
  // or the pathname changes. We intentionally do NOT save on every scroll
  // event to avoid main-thread jank on long feeds.
  useEffect(() => {
    return () => {
      const positions = readPositions();
      positions[pathname] = window.scrollY;
      writePositions(positions);
    };
  }, [pathname]);
}

export default useScrollRestoration;
