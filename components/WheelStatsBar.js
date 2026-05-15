"use client";

/**
 * WheelStatsBar — public per-wheel stats block.
 *
 * This is the "Information Gain" surface that fixes the SEO problem: every
 * wheel page now exposes unique data (segment distribution, top result,
 * freshness signal) that crawlers can index and competitors can't replicate
 * with a static copy of our segment list.
 *
 * Data flow:
 *   - SSR seeds `initialStats` from getWheelMeta() so the markup is in the
 *     HTML for crawlers (not behind a fetch).
 *   - Client listens for the `wheel:spin-counted` event and applies an
 *     OPTIMISTIC UPDATE locally — bumps spin_count, increments the matching
 *     segment's hit count, and recomputes percentages in-memory. No fetch
 *     is issued for the common case. This keeps DB read pressure flat
 *     regardless of how many users are spinning.
 *   - A periodic background refresh (every 60s, only while the tab is
 *     visible) reconciles local state with the server in case other users
 *     have spun the same wheel concurrently. This is the only network read.
 *
 * Intentionally public for both logged-in and logged-out users — gating
 * these numbers behind auth/Pro defeats the SEO purpose.
 */

import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import { timeAgo } from "@utils/HelperFunctions";

function formatCount(n) {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

export default function WheelStatsBar({ wheelId, initialStats = null, feedIsEmpty = true }) {
  // Show the "Last spun" freshness line only when the Spin Stories feed has
  // no public data yet — once the feed is visible it already shows timestamps
  // per card, making this line redundant. Flips to false on the first saved
  // decision event (optimistic) or whenever the parent sets feedIsEmpty=false.
  const [showFreshness, setShowFreshness] = useState(feedIsEmpty);

  const [stats, setStats] = useState(() => ({
    spin_count: initialStats?.spin_count || 0,
    view_count: initialStats?.view_count || 0,
    lastSpunAt: initialStats?.lastSpunAt || null,
    topSegments: Array.isArray(initialStats?.topSegments)
      ? initialStats.topSegments
      : [],
  }));

  // Apply a single spin's worth of changes to local state without hitting
  // the server. We mirror the server-side counter math so the UI stays in
  // sync with what the next real refresh will report. The label is
  // sanitized the same way the server does (lib/wheelAnalytics.js) so the
  // matching segment row is found even when the editor stored extra
  // whitespace.
  function sanitizeLabel(label) {
    if (typeof label !== "string") return null;
    const trimmed = label.replace(/\s+/g, " ").trim();
    if (!trimmed) return null;
    return trimmed.slice(0, 100).replace(/[.$]/g, "_");
  }

  function applyLocalSpin(prev, segmentLabel) {
    const newSpinCount = (prev.spin_count || 0) + 1;
    const key = sanitizeLabel(segmentLabel);

    // Build a fresh top-segments list from the existing one + the new hit.
    // We keep this list at top-5 so the UI doesn't grow unbounded; rare
    // long-tail segments will reappear on the next server refresh if they
    // overtake a current top-5 entry.
    let working = prev.topSegments.map((s) => ({
      label: s.label,
      count: s.count,
    }));

    if (key) {
      const idx = working.findIndex((s) => sanitizeLabel(s.label) === key);
      if (idx >= 0) {
        working[idx] = { ...working[idx], count: working[idx].count + 1 };
      } else {
        // First time we're seeing this label client-side. Add it; the
        // background refresh will reconcile against authoritative data.
        working.push({ label: segmentLabel, count: 1 });
      }
    }

    working.sort((a, b) => b.count - a.count);
    working = working.slice(0, 5);

    const totalForPct = working.reduce((s, x) => s + x.count, 0) || 1;
    const topSegments = working.map((s) => ({
      ...s,
      percentage: Math.round((s.count / totalForPct) * 1000) / 10,
    }));

    return {
      ...prev,
      spin_count: newSpinCount,
      lastSpunAt: new Date().toISOString(),
      topSegments,
    };
  }

  useEffect(() => {
    if (!wheelId) return;
    let ignore = false;
    let intervalId = null;

    async function refresh() {
      try {
        const res = await fetch(`/api/wheel-analytics/${wheelId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (ignore) return;
        const a = json?.analytics || {};
        setStats({
          spin_count: a.spin_count || 0,
          view_count: a.view_count || 0,
          lastSpunAt: a.lastSpunAt || null,
          topSegments: Array.isArray(a.topSegments) ? a.topSegments : [],
        });
      } catch {
        // Silent — stats are non-critical UI.
      }
    }

    // Only fetch on mount when SSR didn't seed us. Avoids a redundant
    // round-trip on every wheel page load.
    if (!initialStats) {
      refresh();
    }

    // When the user saves a decision, the feed gets an entry — at that point
    // the per-card timestamps make the global "Last spun" line redundant.
    const onDecisionSaved = (event) => {
      if (event?.detail?.wheelId === wheelId) setShowFreshness(false);
    };

    // Optimistic update on every spin — no network call. Keeps DB read
    // pressure flat regardless of how many spins the user does.
    const onSpinCounted = (event) => {
      const eventWheelId = event?.detail?.wheelId;
      if (eventWheelId !== wheelId) return;
      const segmentLabel = event?.detail?.segmentLabel ?? null;
      setStats((prev) => applyLocalSpin(prev, segmentLabel));
    };

    // Background reconciliation: refetch every 60s while the tab is
    // visible so other users' spins eventually surface in this user's UI.
    // Stays quiet when the tab is hidden (visibilitychange guard) so a
    // backgrounded tab on someone's phone doesn't keep polling.
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      refresh();
    };
    intervalId = setInterval(tick, 60_000);

    if (typeof window !== "undefined") {
      window.addEventListener("wheel:spin-counted", onSpinCounted);
      window.addEventListener("wheel:decision-saved", onDecisionSaved);
    }

    return () => {
      ignore = true;
      if (intervalId) clearInterval(intervalId);
      if (typeof window !== "undefined") {
        window.removeEventListener("wheel:spin-counted", onSpinCounted);
        window.removeEventListener("wheel:decision-saved", onDecisionSaved);
      }
    };
  }, [wheelId, initialStats]);

  // Don't render the block at all on a brand-new wheel with zero engagement
  // — an empty distribution chart looks worse than no chart. As soon as
  // anyone spins, the block appears.
  const hasData =
    stats.spin_count > 0 ||
    (stats.topSegments && stats.topSegments.length > 0);
  if (!hasData) return null;

  const top = stats.topSegments[0] || null;

  return (
    <section
      aria-label="Wheel statistics"
      className="mt-4 mb-4 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 p-4 sm:p-5"
    >
      {/* Header row: total spins + last-spun freshness */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
          <Shuffle className="inline -mt-0.5 mr-1" size={16} />
          {formatCount(stats.spin_count)} total spins
        </h2>
        {stats.lastSpunAt && showFreshness ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Last spun {timeAgo(stats.lastSpunAt)}
          </span>
        ) : null}
      </div>

      {/* "Top result" headline — the single most-landed segment. This is the
          line that gives the page its unique-per-wheel snippet for search. */}
      {top ? (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Most-landed result:{" "}
          <span className="font-semibold text-gray-900 dark:text-white">
            {top.label}
          </span>{" "}
          <span className="text-gray-500 dark:text-gray-400">
            ({top.percentage}% of {formatCount(stats.spin_count)} spins)
          </span>
        </p>
      ) : null}

      {/* Distribution — top 5 segments rendered as horizontal bars. Each row
          is a complete data point a crawler can read straight out of the
          DOM (label + percentage + count), no JS execution required. */}
      {stats.topSegments.length > 1 ? (
        <ul className="space-y-1.5">
          {stats.topSegments.map((seg) => (
            <li key={seg.label} className="text-sm">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="truncate text-gray-800 dark:text-gray-200">
                  {seg.label}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                  {seg.percentage}% · {formatCount(seg.count)}
                </span>
              </div>
              <div
                className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={seg.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full bg-blue-500 dark:bg-blue-400"
                  style={{ width: `${Math.min(100, seg.percentage)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
