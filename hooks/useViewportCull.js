"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Lightweight viewport culling for mixed-height feeds.
 *
 * - Uses a single IntersectionObserver.
 * - Caches measured heights once per item index.
 * - Only re-renders when the visible set actually changes.
 * - SSR / old browsers fall back to rendering everything (no observer overhead).
 *
 * @param {Object} options
 * @param {number} options.itemCount - total number of items
 * @param {string|null} options.rootMargin - observer rootMargin; auto-detected by default
 * @param {number} options.minHeight - placeholder height fallback (default 180)
 */
function getDefaultRootMargin() {
  if (typeof window === "undefined") return "0px";
  // Keep DOM light on mobile; slightly larger buffer on desktop.
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  return isMobile ? "300px" : "600px";
}

export function useViewportCull({ itemCount, rootMargin = null, minHeight = 180 }) {
  const observerRef = useRef(null);
  const elementsRef = useRef(new Map()); // index -> DOM node
  const heightsRef = useRef(new Map()); // index -> number
  const visibleRef = useRef(new Set());
  const storeRef = useRef(null);

  if (!storeRef.current) {
    storeRef.current = {
      snapshot: new Set(),
      listeners: new Set(),
      set(value) {
        if (setsEqual(this.snapshot, value)) return;
        this.snapshot = value;
        this.listeners.forEach((cb) => cb());
      },
    };
  }

  const emptySetRef = useRef(new Set());
  const visible = useSyncExternalStore(
    useCallback((cb) => {
      storeRef.current.listeners.add(cb);
      return () => storeRef.current.listeners.delete(cb);
    }, []),
    () => storeRef.current.snapshot,
    () => emptySetRef.current // SSR snapshot (stable reference)
  );

  const measure = useCallback((index, node) => {
    if (!node || heightsRef.current.has(index)) return;
    const height = node.getBoundingClientRect().height;
    if (height > 0) heightsRef.current.set(index, Math.max(minHeight, height));
  }, [minHeight]);

  const getHeight = useCallback((index) => heightsRef.current.get(index) || minHeight, [minHeight]);

  const register = useCallback((index, node) => {
    if (!node) {
      elementsRef.current.delete(index);
      return;
    }
    node.dataset.vcIndex = String(index);
    elementsRef.current.set(index, node);
    observerRef.current?.observe(node);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      storeRef.current.set(new Set(Array.from({ length: itemCount }, (_, i) => i)));
      return;
    }

    const finalRootMargin = rootMargin ?? getDefaultRootMargin();
    observerRef.current?.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.vcIndex);
          if (Number.isNaN(index)) return;
          const wasVisible = visibleRef.current.has(index);
          if (entry.isIntersecting && !wasVisible) {
            visibleRef.current.add(index);
            changed = true;
          } else if (!entry.isIntersecting && wasVisible) {
            visibleRef.current.delete(index);
            changed = true;
          }
        });
        if (changed) storeRef.current.set(new Set(visibleRef.current));
      },
      { root: null, rootMargin: finalRootMargin, threshold: 0 }
    );

    elementsRef.current.forEach((node) => node && observerRef.current.observe(node));

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [rootMargin, itemCount]);

  return { visible, register, measure, getHeight };
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
