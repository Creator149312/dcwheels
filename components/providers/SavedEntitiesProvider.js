"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";

/**
 * SavedEntitiesProvider — global, session-scoped cache of every entity the
 * logged-in user has saved to any list.
 *
 * Fetched ONCE per login session via /api/unifiedlist/saved-entities and held
 * in memory, so QuickSaveButton (and anything else) can answer "is this saved?"
 * synchronously with zero per-card requests. Mutations update the cache
 * optimistically via addSaved / removeSaved.
 */

const SavedEntitiesContext = createContext(null);

// IMDb-style persistence: cached lists survive page reloads so bookmarks render
// correctly before any network call. Namespaced per user to prevent cross-
// account leakage on shared devices. Background refetch still reconciles.
const STORAGE_PREFIX = "savedEntities:";

function readCache(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.lists) ? parsed.lists : null;
  } catch {
    return null;
  }
}

function writeCache(userId, lists) {
  try {
    if (!userId || !Array.isArray(lists)) return;
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify({ v: 1, lists }));
  } catch {
    // Storage full / private mode — persistence is best-effort, never fatal
  }
}

function clearCache(userId) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + userId);
  } catch {}
}

export function SavedEntitiesProvider({ children }) {
  const { data: session, status: authStatus } = useSession();
  const userId = session?.user?.id ? String(session.user.id) : null;

  // All of the user's lists (incl. empty) with their entity items.
  // null = not loaded yet.
  const [lists, setLists] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);
  const hydratedFromCacheRef = useRef(false);

  // Hydrate from localStorage as soon as we know who the user is.
  // Instant first paint with last-known state; the lazy refetch reconciles.
  useEffect(() => {
    if (!userId || hydratedFromCacheRef.current) return;
    hydratedFromCacheRef.current = true;
    const cached = readCache(userId);
    if (cached) setLists(cached);
  }, [userId]);

  // Lazy hydration: the batch fetch fires only when a consumer first needs
  // saved state (first bookmark interaction / picker open) — not at login.
  // This keeps onboarding and anonymous-to-authenticated transitions free of
  // an extra request, matching how YouTube defers Watch Later data.
  const ensureLoaded = useCallback(() => {
    if (authStatus !== "authenticated" || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);

    fetch("/api/unifiedlist/saved-entities")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLists(d?.lists || []))
      .catch(() => setLists([])) // fail open: everything looks unsaved
      .finally(() => setLoading(false));
  }, [authStatus]);

  // Getters run during consumers' render, so the fetch (and its setState) is deferred out of it.
  const requestLoad = useCallback(() => {
    if (fetchedRef.current || authStatus !== "authenticated") return;
    queueMicrotask(ensureLoaded);
  }, [authStatus, ensureLoaded]);

  // Write-through persistence: every mutation (and the fresh fetch above)
  // flows through setLists, so this keeps localStorage in sync.
  useEffect(() => {
    if (userId && lists !== null) writeCache(userId, lists);
  }, [userId, lists]);

  useEffect(() => {
    // Logged out: clear both layers so a different account never sees stale data
    if (authStatus === "unauthenticated") {
      fetchedRef.current = false;
      hydratedFromCacheRef.current = false;
      if (userId) clearCache(userId);
      setLists(null);
    }
  }, [authStatus, userId]);

  // Derived lookups, recomputed only when lists change:
  // savedMap: entityId -> first {listId, itemId} (QuickSaveButton un-save ref)
  // membershipMap: entityId -> Set<listId> (picker ✓ indicators, multi-list)
  const { savedMap, membershipMap } = useMemo(() => {
    const saved = new Map();
    const membership = new Map();
    for (const list of lists ?? []) {
      for (const item of list.items || []) {
        const eid = String(item.entityId);
        if (!saved.has(eid)) {
          saved.set(eid, { listId: String(list.id), itemId: item.itemId });
        }
        let set = membership.get(eid);
        if (!set) {
          set = new Set();
          membership.set(eid, set);
        }
        set.add(String(list.id));
      }
    }
    return { savedMap: saved, membershipMap: membership };
  }, [lists]);

  const value = useMemo(
    () => ({
      // true = loaded (or user is a guest), false = still fetching
      isLoaded: lists !== null || authStatus === "unauthenticated",
      isFetching: loading,
      ensureLoaded,
      lists: lists ?? [],
      getSaved: (entityId) => {
        requestLoad();
        return savedMap.get(String(entityId)) || null;
      },
      getMemberListIds: (entityId) => {
        requestLoad();
        return membershipMap.get(String(entityId)) || new Set();
      },
      addSaved: (entityId, ref) =>
        setLists((prev) =>
          (prev ?? []).map((l) =>
            String(l.id) === String(ref.listId) &&
            !(l.items || []).some((i) => String(i.entityId) === String(entityId))
              ? { ...l, items: [...(l.items || []), { entityId: String(entityId), itemId: ref.itemId }] }
              : l
          )
        ),
      removeSaved: (entityId, listId) =>
        setLists((prev) =>
          (prev ?? []).map((l) =>
            String(l.id) === String(listId)
              ? { ...l, items: (l.items || []).filter((i) => String(i.entityId) !== String(entityId)) }
              : l
          )
        ),
      addList: (list) =>
        setLists((prev) => [...(prev ?? []), { ...list, id: String(list.id), items: [] }]),
    }),
    [lists, authStatus, savedMap, membershipMap, loading, ensureLoaded, requestLoad]
  );

  return (
    <SavedEntitiesContext.Provider value={value}>
      {children}
    </SavedEntitiesContext.Provider>
  );
}

export function useSavedEntities() {
  return useContext(SavedEntitiesContext);
}
