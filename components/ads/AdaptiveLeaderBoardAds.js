"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function AdSlot({ slot, width, minHeight, className }) {
  const insRef = useRef(null);
  // adReady prevents Google from seeing this tag until width > 0
  const [adReady, setAdReady] = useState(false);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    const doPush = () => {
      if (
        !el.isConnected ||
        el.dataset.adsPushed ||
        el.getAttribute("data-adsbygoogle-status")
      )
        return;

      // Strict check to prevent TagError
      if (el.offsetWidth === 0) return;

      // 1. Reveal class to Google
      setAdReady(true);

      // 2. Mark as pushed
      el.dataset.adsPushed = "1";

      // 3. Trigger push after a tiny delay to ensure class is applied
      try {
        setTimeout(() => {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }, 50);
      } catch (error) {
        console.error("[AdSlot] push failed", slot, error);
      }
    };

    const tryPush = () => {
      if (el.offsetWidth > 0) {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(doPush, { timeout: 1000 });
        } else {
          setTimeout(doPush, 100);
        }
        return true;
      }
      return false;
    };

    if (tryPush()) return;

    const ro = new ResizeObserver(() => {
      if (tryPush()) ro.disconnect();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [slot]);

  return (
    <ins
      ref={insRef}
      // "adsbygoogle" class is ONLY added if adReady is true
      className={`${adReady ? "adsbygoogle" : ""} ${className || ""}`}
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
