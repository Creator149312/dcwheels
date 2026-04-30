"use client";
import { useEffect, useRef } from "react";

const AdsUnit = ({ slot }) => {
  const insRef = useRef(null);

  // Self-push on mount, but only when the <ins> actually has non-zero width.
  //
  // The right sidebar uses `hidden lg:block` (display:none below 1024px), so
  // on mobile its <ins> elements have width=0. Pushing in that state throws
  //   `TagError: adsbygoogle.push() error: No slot size for availableWidth=0`
  // and burns the slot. We instead wait for the element to become visible
  // (e.g. user resizes / rotates past the breakpoint) via ResizeObserver.
  //
  // Two-layer guard (unchanged):
  //   1. `data-ads-pushed` is OUR marker, set synchronously, so an effect
  //      re-run cannot enqueue a second push for the same <ins>.
  //   2. `data-adsbygoogle-status` is Google's async marker, set after the
  //      script fills the slot.
  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    const tryPush = () => {
      if (!el.isConnected) return false;
      if (el.dataset.adsPushed) return true;
      if (el.getAttribute("data-adsbygoogle-status")) return true;
      // offsetWidth covers both display:none ancestors and zero-width parents.
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

    // Defer push until the slot becomes visible. ResizeObserver fires
    // whenever the element gains non-zero dimensions (breakpoint cross,
    // device rotation, parent unhide, etc.).
    const ro = new ResizeObserver(() => {
      if (tryPush()) ro.disconnect();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-800 text-center px-0 md:mx-0 mt-2 mb-3">
      <div className="text-xs text-center">Advertisement</div>
      <div className="mt-1 justify-center">
        <ins
          ref={insRef}
          className="adsbygoogle max-w-[320px] sm:max-w-[640px] md:max-w-[768px] lg:max-w-[1024px] min-h-[280px]"
          style={{ display: "block" }}
          data-ad-client="ca-pub-6746947892342481"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default AdsUnit;
