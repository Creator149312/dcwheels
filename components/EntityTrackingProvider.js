"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { useSession } from "next-auth/react";
import { useSavedEntities } from "@components/providers/SavedEntitiesProvider";

const EntityTrackingContext = createContext(null);

/**
 * Provides the current user's entity state for a single topic page:
 * - status: "want" | "done" | null  (from UserEntityStatus — fetched here)
 * - listMembership: { listId, itemId } | null  (from the GLOBAL saved-entities
 *   cache — no per-page request needed since SavedEntitiesProvider hydrates
 *   once per login session)
 *
 * Shared across TrackQuickButton, AddToListButton, and DoneNudge.
 */
export function EntityTrackingProvider({ entityId, children }) {
  const { status: authStatus } = useSession();
  const savedEntities = useSavedEntities(); // null when provider is absent
  const [statusData, setStatusData] = useState(null);
  const [userRating, setUserRating] = useState(null);
  // Local fallback for list membership when the global provider isn't mounted
  const [localListData, setLocalListData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Source of truth for list membership: global cache when available
  const listData = savedEntities ? savedEntities.getSaved(entityId) : localListData;

  // setListData stays API-compatible for AddToListButton writes; when the
  // global cache exists, writes land there (AddToListButton syncs it too).
  const setListData = (val) => {
    if (savedEntities && val) savedEntities.addSaved(entityId, val);
    else setLocalListData(val);
  };

  useEffect(() => {
    if (authStatus !== "authenticated" || !entityId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    // When the global cache is mounted, only the status lookup remains.
    // Otherwise (provider absent) fall back to the legacy two-call flow.
    const fetches = [
      fetch(`/api/user-entity-status?entityId=${entityId}`).then((r) => r.json()),
    ];
    if (!savedEntities) {
      fetches.push(
        fetch(`/api/unifiedlist/by-entity?entityId=${entityId}`).then((r) => r.json())
      );
    }

    Promise.all(fetches)
      .then(([statusRes, listRes]) => {
        if (cancelled) return;
        setStatusData(statusRes.found ? { status: statusRes.status } : null);
        if (listRes) {
          setLocalListData(
            listRes.found
              ? { listId: listRes.listId, itemId: listRes.itemId }
              : null
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatusData(null);
          setLocalListData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, entityId, savedEntities]);

  const value = useMemo(
    () => ({
      statusData,
      setStatusData,
      listData,
      setListData,
      isLoading,
      userRating,
      setUserRating,
    }),
    [statusData, listData, isLoading, userRating]
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
