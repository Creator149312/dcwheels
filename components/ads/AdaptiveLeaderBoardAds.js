"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function AdSlot({ slot, width, minHeight, className }) {
  const insRef = useRef(null);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

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

    // Use ResizeObserver exclusively — reads width from contentRect (no
    // reflow) instead of el.offsetWidth (forces synchronous layout flush).
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      if (w === 0) return;
      if (el.dataset.adsScheduled || el.getAttribute("data-adsbygoogle-status")) {
        ro.disconnect();
        return;
      }
      el.dataset.adsScheduled = "1";
      el.classList.add("adsbygoogle");
      ro.disconnect();
      schedulePush();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [slot]);

  return (
    <ins
      ref={insRef}
      className={className || ""}
      style={{
        display: "block",
        width: "100%",
        minWidth: `${width}px`,
        minHeight: `${minHeight}px`,
      }}
      data-ad-client="ca-pub-6746947892342481"
      data-ad-slot={slot}
      data-ad-format="horizontal"
      data-full-width-responsive="false"
    />
  );
}

function AdaptiveLeaderBoardInner({ desktopSlot, mobileSlot }) {
  return (
    <div className="w-full my-4">
      {/* Mobile Slot: Hidden on desktop via sm:hidden. 
          AdSlot will only 'activate' if this container is visible. */}
      <div className="flex justify-center overflow-hidden sm:hidden min-h-[50px] bg-gray-50/50 dark:bg-gray-900/20">
        <AdSlot slot={mobileSlot} width={320} minHeight={50} />
      </div>

      {/* Desktop Slot: Hidden on mobile via hidden sm:flex. 
          AdSlot will stay 'dormant' on mobile devices. */}
      <div className="hidden sm:flex w-full bg-gray-50/50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl items-center justify-center overflow-hidden min-h-[120px]">
        <div className="w-full max-w-[728px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm mx-auto overflow-hidden">
          <AdSlot slot={desktopSlot} width={728} minHeight={90} />
        </div>
      </div>
    </div>
  );
}

export default function AdaptiveLeaderBoardAds(props) {
  const pathname = usePathname();
  return <AdaptiveLeaderBoardInner key={pathname} {...props} />;
}
