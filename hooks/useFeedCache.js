/**
 * useFeedCache Hook
 * 
 * React hook for managing cached feed fetching.
 * Automatically uses session cache when available, falls back to API.
 * 
 * Usage:
 * const { items, loading, error, hasMore, loadMore } = useFeedCache({
 *   type: 'anime',
 *   externalId: '123',
 *   limit: 8
 * });
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { feedCache } from '@/lib/feedCache';

export function useFeedCache({
  type = '',
  externalId = '',
  tag = '',
  userId = '',
  docType = '',
  limit = 8,
  endpoint = '/api/feed', // API endpoint to use
  initialItems = [],
  initialNextCursor = null,
  rootMargin = '400px', // Optional observer margin
} = {}) {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(
    initialNextCursor !== null || initialItems.length === 0
  );

  // Track if initial load is done
  const initialLoadDone = useRef(false);
  // Track current cursor for pagination
  const cursorRef = useRef(initialNextCursor);
  // Track if we're currently fetching to prevent race conditions
  const fetchingRef = useRef(false);
  // Track if we've ever completed a successful fetch so transient errors don't kill hasMore
  const everFetchedRef = useRef(initialItems.length > 0);

  /**
   * Fetch feed items from API
   */
  const fetchFeed = useCallback(
    async (cursor = null, { isSWR = false } = {}) => {
      // Prevent duplicate fetches
      if (fetchingRef.current) return;
      fetchingRef.current = true;

      try {
        if (!isSWR) setError(null);

        // Build query params
        const params = new URLSearchParams({
          limit: String(limit),
          ...(type && { type }),
          ...(externalId && { externalId }),
          ...(tag && { tag }),
          ...(userId && { userId }),
          ...(docType && { docType }),
          ...(cursor && { cursor }),
        });

        const response = await fetch(`${endpoint}?${params.toString()}`, {
          method: 'GET',
          cache: 'no-store', // Always fetch fresh from server
        });

        if (!response.ok) {
          throw new Error(`Feed fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        const newItems = data.items || [];
        const nextCursor = data.nextCursor || null;
        const more = data.hasMore ?? false;

        // Store in cache
        if (!cursor) {
          // First load: replace cache
          feedCache.set(type, externalId, tag, newItems, nextCursor, userId, docType);
          setItems(newItems);
        } else {
          // Pagination: append to cache
          feedCache.append(type, externalId, tag, newItems, nextCursor, userId, docType);
          setItems((prev) => [...prev, ...newItems]);
        }

        cursorRef.current = nextCursor;
        setHasMore(more);
        everFetchedRef.current = true;
      } catch (err) {
        console.error('Feed cache error:', err);
        if (!isSWR) {
          setError(err.message || 'Failed to load feed');
          // Don't kill infinite scroll on transient errors if we've already loaded successfully
          if (!everFetchedRef.current) {
            setHasMore(false);
          }
        }
      } finally {
        fetchingRef.current = false;
        if (!isSWR) setLoading(false);
      }
    },
    [type, externalId, tag, userId, docType, limit, endpoint]
  );

  /**
   * Load more items (infinite scroll)
   */
  const loadMore = useCallback(() => {
    if (!hasMore || fetchingRef.current) return;

    setLoading(true);
    fetchFeed(cursorRef.current);
  }, [hasMore, fetchFeed]);

  /**
   * Refresh feed (clear cache and reload)
   */
  const refresh = useCallback(() => {
    feedCache.clear(type, externalId, tag, userId, docType);
    cursorRef.current = null;
    setLoading(true);
    fetchFeed(null);
  }, [type, externalId, tag, userId, docType, fetchFeed]);

  // Sentinel logic: automatically trigger loadMore when sentinel is visible
  const sentinelRef = useRef(null);

  useEffect(() => {
    // Only observe if there are more items and we aren't already fetching
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin } // Use customizable margin
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, loading, loadMore]);

  /**
   * Initial load: check cache first, then fetch if needed.
   * Implements stale-while-revalidate: show cached/SSR data immediately,
   * then refresh in background if the cache is stale.
   */
  useEffect(() => {
    // Only run once per component mount
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    // Try to use cached items first
    const cachedItems = feedCache.get(type, externalId, tag, userId, docType);

    if (cachedItems && cachedItems.length > 0) {
      // Show cached items immediately
      setItems(cachedItems);
      const lastCursor = feedCache.getLastCursor(type, externalId, tag, userId, docType);
      cursorRef.current = lastCursor;
      setHasMore(lastCursor !== null);
      everFetchedRef.current = true;
      setLoading(false);

      // Revalidate in background if the cache is older than 1 minute
      const cacheAge = Date.now() - (feedCache.getTimestamp?.(type, externalId, tag, userId, docType) || 0);
      if (cacheAge > 60 * 1000) {
        fetchFeed(null, { isSWR: true });
      }
    } else if (initialItems.length > 0) {
      // Already has initial items (SSR), don't fetch page 1
      // But we should store them in cache so they are available on next navigation
      feedCache.set(type, externalId, tag, initialItems, initialNextCursor, userId, docType);
      // Ensure the cursorRef is synced with what we got from SSR
      cursorRef.current = initialNextCursor;
      setHasMore(initialNextCursor !== null);
      everFetchedRef.current = true;
      setLoading(false);
    } else {
      // No cache and no initial items: fetch from API
      setLoading(true);
      fetchFeed(null);
    }
  }, [type, externalId, tag, userId, docType, fetchFeed, initialItems, initialNextCursor]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    sentinelRef,
    cacheStats: feedCache.getStats(), // For debugging
  };
}

export default useFeedCache;
