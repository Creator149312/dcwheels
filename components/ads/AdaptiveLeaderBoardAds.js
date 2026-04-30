"use client";
import { useState, useEffect, useRef } from "react";

export default function AdaptiveLeaderBoardAds({ desktopSlot, mobileSlot }) {
  const [isMobile, setIsMobile] = useState(false);
  const insRef = useRef(null);

  useEffect(() => {
    // Check screen size on mount
    const checkSize = () => setIsMobile(window.innerWidth < 640);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // Self-push when the chosen variant (mobile vs desktop) is mounted, but
  // only when the slot has non-zero width. If a parent is hidden at this
  // breakpoint we wait via ResizeObserver instead of throwing
  //   `TagError: No slot size for availableWidth=0`.
  //
  // Two-layer guard (see AdsUnit.js for full rationale):
  //   1. `data-ads-pushed` is set synchronously per-<ins>, so isMobile
  //      flipping back and forth can't double-push the same element.
  //   2. `data-adsbygoogle-status` is Google's async marker.
  // When the breakpoint actually crosses, React unmounts one branch and
  // mounts the other — the new <ins> has neither attribute set, so it
  // pushes exactly once.
  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    const tryPush = () => {
      if (!el.isConnected) return false;
      if (el.dataset.adsPushed) return true;
      if (el.getAttribute("data-adsbygoogle-status")) return true;
      if (el.offsetWidth === 0) return false;
      el.dataset.adsPushed = "1";
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Race conditions and dev-only double-invokes: safe to ignore.
      }
      return true;
    };

    if (tryPush()) return;

    const ro = new ResizeObserver(() => {
      if (tryPush()) ro.disconnect();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [isMobile]);

  return (
    <div className="w-full bg-gray-50/50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] flex flex-col items-center justify-center transition-all">
      <div className="w-full max-w-[728px] h-[100px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm mx-auto overflow-hidden">
        
        {isMobile ? (
          /* Mobile Ad - 320x50 fits perfectly in your 100px height */
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "inline-block", width: "320px", height: "50px" }}
            data-ad-client="ca-pub-6746947892342481"
            data-ad-slot={mobileSlot}
          />
        ) : (
          /* Desktop Ad - 728x90 fits perfectly in your 100px height */
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "inline-block", width: "728px", height: "90px" }}
            data-ad-client="ca-pub-6746947892342481"
            data-ad-slot={desktopSlot}
          />
        )}

      </div>
      {/* <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest font-medium">
        Advertisement
      </span> */}
    </div>
  );
}