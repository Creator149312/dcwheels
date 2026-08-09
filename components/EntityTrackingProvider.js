"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";

const EntityTrackingContext = createContext(null);

/**
 * Provides the current user's entity state for a single topic page:
 * - status: "want" | "done" | null  (from UserEntityStatus)
 * - listMembership: { listId, itemId } | null  (from UnifiedList)
 *
 * Both are fetched in parallel ONCE per page and shared across
 * TrackQuickButton, AddToListButton, and DoneNudge.
 */
export function EntityTrackingProvider({ entityId, children }) {
  const { status: authStatus } = useSession();
  const [statusData, setStatusData] = useState(null);
  const [listData, setListData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authStatus !== "authenticated" || !entityId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all([
      fetch(`/api/user-entity-status?entityId=${entityId}`).then((r) => r.json()),
      fetch(`/api/unifiedlist/by-entity?entityId=${entityId}`).then((r) => r.json()),
    ])
      .then(([statusRes, listRes]) => {
        if (cancelled) return;
        setStatusData(statusRes.found ? { status: statusRes.status } : null);
        setListData(
          listRes.found
            ? { listId: listRes.listId, itemId: listRes.itemId }
            : null
        );
      })
      .catch(() => {
        if (!cancelled) {
          setStatusData(null);
          setListData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, entityId]);

  const value = useMemo(
    () => ({
      statusData,
      setStatusData,
      listData,
      setListData,
      isLoading,
    }),
    [statusData, listData, isLoading]
  );

  return (
    <EntityTrackingContext.Provider value={value}>
      {children}
    </EntityTrackingContext.Provider>
  );
}

export function useEntityTracking() {
  return useContext(EntityTrackingContext);
}
