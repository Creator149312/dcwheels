"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const AdsUnitInner = ({ slot }) => {
  const insRef = useRef(null);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    // Schedule push() during browser idle time so AdSense's forced reflows
    // (which are unavoidable inside show_ads_impl.js) happen AFTER LCP is
    // locked in, not during the critical rendering path.
    const schedulePush = () => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(doPush, { timeout: 2000 });
      } else {
        setTimeout(doPush, 0);
      }
    };

    function doPush() {
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
      const width = entries[0]?.contentRect?.width ?? 0;
      if (width === 0) return;
      if (el.dataset.adsScheduled || el.getAttribute("data-adsbygoogle-status")) {
        ro.disconnect();
        return;
      }
      // Mark eagerly so a re-fire can't double-schedule.
      el.dataset.adsScheduled = "1";
      ro.disconnect();
      schedulePush();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [slot]);

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/40 text-center py-2 my-4 rounded-lg border border-gray-100 dark:border-gray-800">
      <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
        Advertisement
      </div>
      <div className="flex justify-center items-center overflow-hidden">
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minHeight: "280px",
          }}
          data-ad-client="ca-pub-6746947892342481"
          data-ad-slot={slot}
          data-ad-format="rectangle, horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
};

export default function AdsUnit({ slot }) {
  const pathname = usePathname();
  return <AdsUnitInner key={`${pathname}-${slot}`} slot={slot} />;
}
