"use client";

import { useEffect } from "react";

/**
 * Tiny client component that POSTs a view-tracking ping on mount.
 *
 * Decouples analytics tracking from the Server Component render so the
 * wheel page can be fully static / CDN-cached. Uses sessionStorage to
 * avoid double-counting when the same tab revisits the same wheel
 * (e.g. back/forward navigation within the SPA).
 */
export default function ViewTracker({ wheelId }) {
  useEffect(() => {
    if (!wheelId) return;

    // Per-tab dedupe: skip if we already pinged for this wheel in this session.
    const key = `view-tracked:${wheelId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (private mode etc.) — fall through and ping anyway.
    }

    const controller = new AbortController();
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wheelId }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // Silent — analytics failure must not surface to the user.
    });

    return () => controller.abort();
  }, [wheelId]);

  return null;
}
