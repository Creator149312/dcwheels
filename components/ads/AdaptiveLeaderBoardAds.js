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
        maxWidth: `${width}px`,
        minHeight: `${minHeight}px`,
        height: `${minHeight}px`,
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
    <div className="w-full my-0 py-0">
      {/* Mobile Slot (< sm): 320x100 Large Mobile Banner for higher viewability & eCPM */}
      <div className="flex sm:hidden justify-center items-center overflow-hidden h-[100px] min-h-[100px] max-h-[100px] bg-muted/20 border border-border/40 rounded-xl">
        <div className="w-full max-w-[320px] h-[100px] flex items-center justify-center overflow-hidden">
          <AdSlot slot={mobileSlot} width={320} minHeight={100} />
        </div>
      </div>

      {/* Tablet & Desktop Slot (>= sm): 728x90 Leaderboard */}
      <div className="hidden sm:flex w-full bg-muted/20 border border-border/40 rounded-xl items-center justify-center overflow-hidden h-[90px] min-h-[90px] max-h-[90px]">
        <div className="w-full max-w-[728px] h-[90px] flex items-center justify-center overflow-hidden">
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
