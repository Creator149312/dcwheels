"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const AdsUnitInner = ({ slot }) => {
  const insRef = useRef(null);
  // adReady controls whether we apply the "adsbygoogle" class
  const [adReady, setAdReady] = useState(false);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    const doPush = () => {
      // 1. Basic guards: is it connected and not already pushed?
      if (
        !el.isConnected ||
        el.dataset.adsPushed ||
        el.getAttribute("data-adsbygoogle-status")
      )
        return;

      // 2. Strict Width check: If 0, we are on mobile/hidden sidebar
      if (el.offsetWidth === 0) return;

      // 3. STEP 1: Reveal the class to Google
      setAdReady(true);

      // 4. STEP 2: Mark as pushed and trigger the actual AdSense push
      el.dataset.adsPushed = "1";
      try {
        // We use a tiny timeout to ensure React has applied the 'adsbygoogle'
        // class to the DOM before Google's script looks for it.
        setTimeout(() => {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }, 50);
      } catch (e) {
        console.error("[AdsUnit] push error", e);
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
    <div className="w-full bg-slate-50 dark:bg-slate-900/40 text-center py-2 my-4 rounded-lg border border-gray-100 dark:border-gray-800">
      <div className="text-[10px] uppercase tracking-widest text-gray-400 mb-2">
        Advertisement
      </div>
      <div className="flex justify-center items-center overflow-hidden">
        <ins
          ref={insRef}
          // The magic is here: Google script ignores tags without this class.
          // We only provide it once we know the width is > 0.
          className={adReady ? "adsbygoogle" : ""}
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
