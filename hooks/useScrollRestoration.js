/**
 * useScrollRestoration.js
 * 
 * Restores scroll position when user navigates back to a page.
 * Saves scroll position in sessionStorage keyed by pathname.
 * 
 * Usage:
 * 'use client';
 * import { useScrollRestoration } from '@/hooks/useScrollRestoration';
 * 
 * export default function MyPage() {
 *   useScrollRestoration(); // Add this line
 *   return <div>...</div>;
 * }
 */

'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function useScrollRestoration() {
  const pathname = usePathname();
  const scrollPositionsRef = useRef({});

  // Load saved positions on mount
  useEffect(() => {
    const saved = sessionStorage.getItem('scroll-positions');
    if (saved) {
      try {
        scrollPositionsRef.current = JSON.parse(saved);
      } catch (err) {
        console.error('Failed to parse saved scroll positions:', err);
      }
    }
  }, []);

  // Save current scroll position before leaving
  useEffect(() => {
    const saveScrollPosition = () => {
      scrollPositionsRef.current[pathname] = window.scrollY;
      sessionStorage.setItem(
        'scroll-positions',
        JSON.stringify(scrollPositionsRef.current)
      );
    };

    // Save on scroll (debounced)
    const handleScroll = () => {
      scrollPositionsRef.current[pathname] = window.scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Save before route change
    const handleBeforeUnload = () => {
      saveScrollPosition();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Save position when component unmounts
      saveScrollPosition();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname]);

  // Restore scroll position on mount
  useEffect(() => {
    const savedPosition = scrollPositionsRef.current[pathname];

    if (savedPosition !== undefined && savedPosition > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo({
          top: savedPosition,
          behavior: 'auto', // Instant restore (no animation)
        });
      });
    }
  }, [pathname]);
}

export default useScrollRestoration;
