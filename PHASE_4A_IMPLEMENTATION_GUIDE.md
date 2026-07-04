# Phase 4A: Quick Wins Implementation Guide

## Summary
**Time:** 5-6 hours  
**Complexity:** Easy  
**Impact:** +40% perceived performance, professional UX  
**Risk:** Very Low

---

## Task 1: Smart Prefetch (80% Scroll)

### Current Implementation
GlobalSpinFeed already uses IntersectionObserver with `rootMargin: "0px 0px 400px 0px"` (triggers 400px before bottom)

### Enhancement
Implement percentage-based prefetch trigger - fetch when 80% scrolled down.

### Implementation Points

**File 1: useFeedCache.js**
Add optional `prefetchAt` parameter:

```javascript
// Current: loadMore() only on scroll
// New: Add prefetchAt option to trigger at 80% scroll

export function useFeedCache({
  type = '',
  externalId = '',
  tag = '',
  limit = 8,
  endpoint = '/api/feed',
  prefetchAt = 0.8, // 80% scroll trigger (0-1)
} = {}) {
  // ... existing code ...
}
```

**File 2: GlobalSpinFeed.js**
Update observer logic:

```javascript
// BEFORE:
{ rootMargin: "0px 0px 400px 0px" }

// AFTER:
// When scroll reaches 80%, trigger prefetch
const handleScroll = useCallback(() => {
  const scrollHeight = document.documentElement.scrollHeight;
  const scrollTop = window.scrollY;
  const scrollPercent = scrollTop / (scrollHeight - window.innerHeight);
  
  if (scrollPercent >= 0.8 && hasMore && !loadingMore) {
    loadMore(); // Prefetch next batch
  }
}, [hasMore, loadingMore, loadMore]);

window.addEventListener('scroll', handleScroll, { passive: true });
```

### Effort
**Time:** 30-45 minutes  
**Complexity:** Easy  
**Files Modified:** 1-2 (GlobalSpinFeed.js + optional useFeedCache.js)

### Testing
1. Scroll to 80% of page
2. Observe network tab
3. Next batch should load in background
4. Scroll continues smoothly without loading spinner

---

## Task 2: Stale-While-Revalidate (SWR)

### Current Behavior
- User visits page → Cache fetches feed → Items appear
- User waits for API response
- After 5 minutes, cache expires

### New Behavior
- User visits page → Show cached items instantly
- While showing cached, fetch fresh in background
- Fresh arrives → Update items seamlessly
- User never waits for network

### Implementation

**File: lib/feedCache.js**

Add SWR pattern to cache manager:

```javascript
class FeedCacheManager {
  // ... existing code ...

  /**
   * Get items with stale-while-revalidate pattern
   * Returns cached items immediately, fetches fresh in background
   */
  getWithSWR(type, externalId, tag) {
    const key = this.generateCacheKey(type, externalId, tag);
    
    if (!this.cache.has(key)) {
      return { items: null, isStale: false }; // No cache
    }

    const cached = this.cache.get(key);
    const age = Date.now() - cached.timestamp;
    const staleTime = 60000; // 1 minute (default stale threshold)

    return {
      items: cached.items, // Return immediately (even if stale)
      isStale: age > staleTime,
      needsRefresh: age > staleTime,
    };
  }
}

export const feedCache = new FeedCacheManager();
```

**File: hooks/useFeedCache.js**

Update to use SWR pattern:

```javascript
export function useFeedCache({
  type = '',
  externalId = '',
  tag = '',
  limit = 8,
  endpoint = '/api/feed',
  staleTime = 60000, // 1 minute before considered stale
} = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isStaleFetchRef = useRef(false);

  const fetchFeed = useCallback(
    async (cursor = null, isStaleRevalidation = false) => {
      try {
        setError(null);

        // Try SWR pattern: show cached first
        if (!isStaleRevalidation) {
          const swrResult = feedCache.getWithSWR(type, externalId, tag);
          
          if (swrResult.items && swrResult.items.length > 0) {
            // Show cached immediately
            setItems(swrResult.items);

            if (swrResult.needsRefresh) {
              // Cache is stale - fetch fresh in background
              isStaleFetchRef.current = true;
              fetchFeed(cursor, true); // Recursive call for fresh fetch
              return;
            } else {
              // Cache is fresh - done
              setLoading(false);
              return;
            }
          }
        }

        // No cache or explicitly fetching fresh
        setLoading(true);

        const params = new URLSearchParams({
          limit: String(limit),
          ...(type && { type }),
          ...(externalId && { externalId }),
          ...(tag && { tag }),
          ...(cursor && { cursor }),
        });

        const response = await fetch(`${endpoint}?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`Feed fetch failed: ${response.statusText}`);
        }

        const data = await response.json();
        const newItems = data.items || [];

        // Store fresh data in cache
        feedCache.set(type, externalId, tag, newItems);
        setItems(newItems);
      } catch (err) {
        console.error('Feed cache error:', err);
        
        // If this was a stale revalidation, don't show error
        // (user already seeing cached data)
        if (!isStaleRevalidation) {
          setError(err.message || 'Failed to load feed');
        }
      } finally {
        setLoading(false);
        isStaleFetchRef.current = false;
      }
    },
    [type, externalId, tag, limit, endpoint, staleTime]
  );

  // Initial load
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    fetchFeed(null, false);
  }, [type, externalId, tag, fetchFeed]);

  return {
    items,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
  };
}
```

### Effort
**Time:** 2-3 hours  
**Complexity:** Easy-Medium  
**Files Modified:** 2 (feedCache.js + useFeedCache.js)

### Testing
1. First visit page → See data instantly (from cache OR fresh)
2. Edit cache to make it stale (mock > 1 minute old)
3. Visit again → See cached data instantly
4. Monitor network → Fresh fetch happens in background
5. Wait a few seconds → Data updates without spinner

### Before/After Flow
```
BEFORE:
User visits page
  [Waiting for network...]
  [Spinner shows]
  Items appear ✅

AFTER:
User visits page
Items appear instantly ✅ (from cache)
[Quietly fetching fresh in background]
Items update seamlessly (2-3 seconds later)
```

---

## Task 3: Scroll Restoration

### Problem
```
User: Scrolls feed to item #47
User: Clicks topic link
User: Clicks back button
Result: Page jumps to top, item #47 out of view
😞 User experience broken
```

### Solution
Save scroll position before navigation, restore on return.

### Implementation

**File: hooks/useScrollRestoration.js** (NEW FILE)

```javascript
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Restore scroll position when user navigates back
 * Saves scroll position in sessionStorage keyed by pathname
 */
export function useScrollRestoration() {
  const pathname = usePathname();
  const scrollPositionsRef = useRef({});

  // Save scroll position before leaving page
  useEffect(() => {
    const handleBeforeUnload = () => {
      scrollPositionsRef.current[pathname] = window.scrollY;
      sessionStorage.setItem(
        'scroll-positions',
        JSON.stringify(scrollPositionsRef.current)
      );
    };

    // Save on route change (Next.js)
    const handleRouteChange = () => {
      handleBeforeUnload();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      handleBeforeUnload(); // Save before unmounting
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pathname]);

  // Restore scroll position on mount
  useEffect(() => {
    // Restore saved position
    const saved = sessionStorage.getItem('scroll-positions');
    if (saved) {
      try {
        scrollPositionsRef.current = JSON.parse(saved);
        const savedPosition = scrollPositionsRef.current[pathname];

        if (savedPosition !== undefined && savedPosition > 0) {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            window.scrollTo({
              top: savedPosition,
              behavior: 'auto', // No animation - instant restore
            });
          });
        }
      } catch (err) {
        console.error('Failed to restore scroll:', err);
      }
    }
  }, [pathname]);
}
```

**File: app/page.js** (Update to use hook)

```javascript
'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import HomepageFeedsWrapper from '@components/HomepageFeedsWrapper';

export default function HomePage({ initialGlobalFeed, initialGlobalCursor }) {
  // Add scroll restoration
  useScrollRestoration();

  return (
    <div className="mx-auto max-w-3xl px-0 sm:px-4 py-4 sm:py-8">
      {/* ... existing JSX ... */}
      <HomepageFeedsWrapper 
        initialGlobalFeed={initialGlobalFeed}
        initialGlobalCursor={initialGlobalCursor}
      />
    </div>
  );
}
```

**File: app/(content)/_shared/TopicPageLayout.js** (Add to RSC wrapper)

```javascript
'use client';

import { useScrollRestoration } from '@/hooks/useScrollRestoration';

// Inside your client component wrapper
export function TopicPageClient({ children }) {
  useScrollRestoration(); // Add hook call

  return <>{children}</>;
}
```

### Effort
**Time:** 1-2 hours  
**Complexity:** Easy  
**Files Modified:** 3-4 (new hook + add to 2-3 pages)

### Testing
1. Scroll feed to 50% down
2. Click a topic link (navigate away)
3. Topic page loads
4. Click browser back button
5. **Observe:** Page scrolls back to 50% automatically ✅

### Before/After
```
BEFORE: Page jumps to top 😞
AFTER: Scroll position restored automatically ✨
```

---

## Combined Implementation Checklist

### Phase 4A Summary

| Task | Files | Time | Difficulty | ROI |
|------|-------|------|-----------|-----|
| 1. Smart Prefetch | 2 | 45m | Easy | High |
| 2. SWR Pattern | 2 | 2-3h | Easy-Med | Very High |
| 3. Scroll Restore | 4 | 1-2h | Easy | High |
| **TOTAL** | **~6** | **4-5.5h** | **Easy** | **Very High** |

### Implementation Order
1. **Day 1 Morning:** Scroll Restoration (quickest, tangible UX improvement)
2. **Day 1 Afternoon:** Smart Prefetch (optimize existing code)
3. **Day 2:** Stale-While-Revalidate (most impactful for perceived performance)
4. **Day 2-3:** Testing + Deploy

---

## Performance Improvements

### Metrics Before Phase 4A
- Perceived load time: 1-2 seconds (wait for API)
- Scroll jank: Possible with large feeds
- User experience: Jumps to top on back navigation

### Metrics After Phase 4A
- Perceived load time: <100ms (show cache immediately)
- Scroll jank: None (prefetch hides waits)
- User experience: Professional, seamless

### Network Profile Improvements
```
Slow 3G (Current):
  1. API request: 5 seconds
  2. Render: 1 second
  3. User waits: 6 seconds 😞

Slow 3G (With Phase 4A):
  1. Show cache: <100ms (instant)
  2. API fetch (background): 5 seconds
  3. Update arrives: User doesn't notice
  4. User experience: Instant ✨
```

---

## Risk Assessment

| Feature | Risk | Mitigation |
|---------|------|-----------|
| Smart Prefetch | Very Low | Test scroll behavior on mobile |
| SWR Pattern | Low | Clear cache if needed, graceful fallback |
| Scroll Restore | Very Low | Test back button with Playwright |

---

## Next: Phase 4B (Virtual Scrolling)

After Phase 4A is deployed and stable (2-3 weeks), evaluate Phase 4B:

**Trigger Phase 4B if:**
- Users loading 100+ items per session
- Memory usage high on mobile
- Scroll performance degrading at 500+ items
- Mobile users complaining about lag

**Phase 4B Implementation:**
```bash
npm install react-window
# Time: 4-6 hours
# ROI: Massive (1000+ items without lag)
```

---

## Deployment Strategy

### Test Plan
```
Day 1:
├─ Local testing (Chrome DevTools)
├─ Mobile testing (slow 3G throttle)
└─ Test back/forward navigation

Day 2:
├─ Deploy to staging
├─ Run Playwright tests
├─ Monitor scroll behavior

Day 3:
├─ Deploy to production (gradual)
├─ Monitor Vercel metrics
└─ Gather user feedback
```

### Rollback Plan
Each feature is independent and can be disabled individually:

```javascript
// Disable SWR: Skip the isStaleRevalidation path
// Disable Smart Prefetch: Increase rootMargin back to 400px
// Disable Scroll Restore: Remove useScrollRestoration hook
```

---

## Final Recommendation

✅ **Implement all of Phase 4A** - Easy wins with massive UX impact
- Combined 4-5.5 hours work
- Perceived performance improvements feel like magic
- Risk is extremely low
- Can deploy incrementally

⏳ **Schedule Phase 4B for after Phase 4A** - Monitor usage patterns
- Only needed if users scroll heavily
- More complex, higher effort
- Huge payoff if needed

---

## Success Metrics

After Phase 4A deployment, track:

1. **Performance Metrics**
   - Core Web Vitals: LCP, FID, CLS
   - Average page load time
   - Time to Interactive

2. **User Metrics**
   - Pages per session (should increase with prefetch)
   - Time on site (should increase with SWR)
   - Scroll depth (how far users scroll)
   - Back button click rate (track with scroll restore)

3. **Technical Metrics**
   - API latency (should decrease - more cache hits)
   - Error rate on `/api/feeds/batch` (should stay <1%)
   - Memory usage per user session (should decrease with SWR)
