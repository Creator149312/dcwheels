"use client";

import { useEffect } from "react";

// 1-in-N probabilistic sample. The bulk of Vercel function cost on cached
// content pages comes from this single endpoint — every page hit fires a
// POST. Skipping 4 of 5 calls on the client saves ~80% of those invocations.
// The server compensates by incrementing the counter by SAMPLE_RATE when a
// ping does come through, so totals remain statistically equivalent. Per-tab
// sessionStorage dedupe still applies as the first gate (back/forward etc).
const SAMPLE_RATE = 5;

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

    // Probabilistic sampling — only 1 in SAMPLE_RATE views actually hits
    // the API. The server scales the increment by SAMPLE_RATE to keep
    // reported view totals roughly accurate.
    if (Math.random() * SAMPLE_RATE >= 1) return;

    const controller = new AbortController();
    fetch("/api/track-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wheelId, sampleN: SAMPLE_RATE }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // Silent — analytics failure must not surface to the user.
    });

    return () => controller.abort();
  }, [wheelId]);

  return null;
}
