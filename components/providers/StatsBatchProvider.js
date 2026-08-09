"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

const StatsBatchContext = createContext(null);

const FLUSH_DELAY_MS = 50;
const MAX_BATCH_SIZE = 40;

/**
 * StatsBatchProvider
 *
 * Collects viewer-state requests from every StatsBar in a feed and flushes
 * them as a single batched server action. This replaces one request per card
 * with one request per visible page of cards.
 *
 * Guest users short-circuit: no registration, no network call.
 */
export function StatsBatchProvider({ children }) {
  const { data: session } = useSession();
  const resultsRef = useRef({}); // key -> { like, follow, save }
  const [, forceRender] = useState(0);
  const pendingRef = useRef(new Set()); // keys waiting to be flushed
  const inFlightRef = useRef(false);
  const flushTimeoutRef = useRef(null);
  const resolverRef = useRef(new Map()); // key -> resolve function

  const flush = async () => {
    if (inFlightRef.current || pendingRef.current.size === 0 || !session?.user) return;

    const keys = [...pendingRef.current].slice(0, MAX_BATCH_SIZE);
    keys.forEach((k) => pendingRef.current.delete(k));
    inFlightRef.current = true;

    try {
      const items = keys.map((key) => {
        const [entityType, entityId] = key.split(":");
        return { entityType, entityId };
      });

      const { getBatchContentStats } = await import("@components/actions/actions");
      const data = await getBatchContentStats({ items });

      resultsRef.current = { ...resultsRef.current, ...data };
      // Notify consumers that results changed.
      forceRender((n) => n + 1);
      keys.forEach((key) => {
        const resolve = resolverRef.current.get(key);
        if (resolve) {
          resolve(data[key] || null);
          resolverRef.current.delete(key);
        }
      });
    } catch (err) {
      console.error("[StatsBatchProvider] flush failed:", err);
      // Resolve pending with null so callers fall back to default (unreacted).
      keys.forEach((key) => {
        const resolve = resolverRef.current.get(key);
        if (resolve) {
          resolve(null);
          resolverRef.current.delete(key);
        }
      });
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current.size > 0) {
        flushTimeoutRef.current = setTimeout(flush, FLUSH_DELAY_MS);
      }
    }
  };

  const scheduleFlush = () => {
    if (flushTimeoutRef.current) return;
    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null;
      flush();
    }, FLUSH_DELAY_MS);
  };

  const register = useCallback((key) => {
    if (!session?.user) return Promise.resolve(null);
    if (resultsRef.current[key] !== undefined) return Promise.resolve(resultsRef.current[key]);
    if (pendingRef.current.has(key) || resolverRef.current.has(key)) {
      return new Promise((resolve) => resolverRef.current.set(key, resolve));
    }
    pendingRef.current.add(key);
    const promise = new Promise((resolve) => resolverRef.current.set(key, resolve));
    scheduleFlush();
    return promise;
  }, [session?.user]);

  const getCached = useCallback((key) => resultsRef.current[key], []);

  const value = useMemo(
    () => ({ register, getCached }),
    [register, getCached]
  );

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    };
  }, []);

  return (
    <StatsBatchContext.Provider value={value}>
      {children}
    </StatsBatchContext.Provider>
  );
}

export function useStatsBatch() {
  return useContext(StatsBatchContext);
}
