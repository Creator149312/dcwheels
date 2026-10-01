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

const REQUEST_TIMEOUT_MS = 10000;
const RETRY_DELAYS_MS = [800, 2500];

class HttpError extends Error {
  constructor(status, statusText) {
    super(`Feed fetch failed: ${status} ${statusText}`);
    this.status = status;
  }
}

// 4xx (except 408/429) won't succeed on retry.
const isRetryable = (err) =>
  !(err instanceof HttpError) || err.status >= 500 || err.status === 408 || err.status === 429;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const requestPage = useCallback(async (url) => {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new HttpError(response.status, response.statusText);
        return await response.json();
      } catch (err) {
        if (!mountedRef.current || attempt >= RETRY_DELAYS_MS.length || !isRetryable(err)) throw err;
        await wait(RETRY_DELAYS_MS[attempt]);
      } finally {
        clearTimeout(timer);
      }
    }
  }, []);

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

        const data = await requestPage(`${endpoint}?${params.toString()}`);
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
        if (!mountedRef.current) return;
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
    [type, externalId, tag, userId, docType, limit, endpoint, requestPage]
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

  const retry = useCallback(() => {
    if (fetchingRef.current) return;
    setHasMore(true);
    setLoading(true);
    fetchFeed(cursorRef.current);
  }, [fetchFeed]);

  // Sentinel logic: automatically trigger loadMore when sentinel is visible
  const sentinelRef = useRef(null);

  useEffect(() => {
    // After retries are exhausted, auto-loading stops until the user taps retry.
    if (!hasMore || loading || error) return;

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
  }, [hasMore, loading, error, loadMore, rootMargin]);

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
      // No background refetch: swapping page 1 mid-scroll rewinds the cursor and
      // reshuffles rows. The 5-min cache TTL bounds staleness instead.
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
    retry,
    refresh,
    sentinelRef,
    cacheStats: feedCache.getStats(), // For debugging
  };
}

export default useFeedCache;
