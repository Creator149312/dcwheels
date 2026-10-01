"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isRouteAdEligible } from "@/lib/adEligibility";

const AdsUnitInner = ({ slot, format = "auto", minHeight = 250, className = "" }) => {
  const insRef = useRef(null);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    let cancelled = false;

    // Schedule push() during browser idle time so AdSense's forced reflows
    // (which are unavoidable inside show_ads_impl.js) happen AFTER LCP is
    // locked in, not during the critical rendering path.
    let idleHandle = null;
    let timerHandle = null;

    const schedulePush = () => {
      if (typeof requestIdleCallback !== "undefined") {
        idleHandle = requestIdleCallback(doPush, { timeout: 2000 });
      } else {
        timerHandle = setTimeout(doPush, 0);
      }
    };

    function doPush() {
      if (cancelled) return;
      if (!el.isConnected) return;
      if (el.dataset.adsActualPushed) return;
      if (el.getAttribute("data-adsbygoogle-status")) return;
      el.dataset.adsActualPushed = "1";
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Race conditions and dev-only double-invokes: safe to ignore.
      }
    }

    // Use ResizeObserver exclusively — the callback fires immediately with
    // the current size on the first observe() call, so we never need to
    // call el.offsetWidth (which forces a synchronous layout/reflow).
    // The width comes from the observer entry's contentRect at zero cost.
    const ro = new ResizeObserver((entries) => {
      if (cancelled) return;
      const width = entries[0]?.contentRect?.width ?? 0;
      if (width === 0) return;
      if (el.dataset.adsScheduled || el.getAttribute("data-adsbygoogle-status")) {
        ro.disconnect();
        return;
      }
      // Mark eagerly so a re-fire can't double-schedule.
      el.dataset.adsScheduled = "1";
      el.classList.add("adsbygoogle");
      ro.disconnect();
      schedulePush();
    });
    ro.observe(el);

    return () => {
      cancelled = true;
      ro.disconnect();
      if (idleHandle && typeof cancelIdleCallback !== "undefined") {
        cancelIdleCallback(idleHandle);
      }
      if (timerHandle) {
        clearTimeout(timerHandle);
      }
    };
  }, [slot]);

  return (
    <div
      className={`w-full bg-muted/5 text-center py-0 my-2 sm:my-6 sm:rounded-xl border-y sm:border border-border/40 overflow-hidden ${className}`}
      style={{
        minHeight: `${minHeight}px`,
        contain: "paint layout",
      }}
    >
      <div className="flex justify-center items-center overflow-hidden w-full" style={{ minHeight: `${minHeight}px` }}>
        <ins
          ref={insRef}
          className="w-full"
          style={{
            display: "block",
            minHeight: `${minHeight}px`,
          }}
          data-ad-client="ca-pub-6746947892342481"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default function AdsUnit({ slot, format, minHeight, className, isEligible = true }) {
  const pathname = usePathname();

  // Route-level suppression (auth, dashboard, embed, etc.) or explicit entity suppression
  if (!isEligible || !isRouteAdEligible(pathname)) {
    return null;
  }

  return (
    <AdsUnitInner
      key={`${pathname}-${slot}`}
      slot={slot}
      format={format}
      minHeight={minHeight}
      className={className}
    />
  );
}
