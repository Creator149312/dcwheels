"use client";

import { useEffect } from "react";

// 1-in-N probabilistic sample. The bulk of Vercel function cost on cached
// content pages comes from this single endpoint.
// Setting SAMPLE_RATE = 5 eliminates ~80% of unnecessary serverless invocations.
const SAMPLE_RATE = 5;

/**
 * Tiny client component that POSTs a view-tracking ping on mount.
 *
 * Decouples analytics tracking from the Server Component render so the
 * wheel page can be fully static / CDN-cached. Uses sessionStorage to
 * avoid double-counting when the same tab revisits the same wheel
 * (e.g. back/forward navigation within the SPA).
 *
 * Uses requestIdleCallback / deferred timer so tracking never competes
 * with above-the-fold paint, wheel canvas setup, or user interaction.
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

    const sendPing = () => {
      fetch("/api/track-view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wheelId, sampleN: SAMPLE_RATE }),
        signal: controller.signal,
        keepalive: true,
      })
        .then((res) => {
          if (res.ok) {
            window.dispatchEvent(
              new CustomEvent("wheel:view-counted", { detail: { wheelId } })
            );
          }
        })
        .catch(() => {
          // Silent — analytics failure must not surface to the user.
        });
    };

    // Defer tracking execution until browser main thread is completely idle
    let idleId = null;
    let timerId = null;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(sendPing, { timeout: 3000 });
    } else {
      timerId = setTimeout(sendPing, 1500);
    }

    return () => {
      controller.abort();
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [wheelId]);

  return null;
}
