"use client";
import { useEffect, useRef } from "react";

const AdsUnit = ({ slot }) => {
  const insRef = useRef(null);

  // Self-push on mount. AdsScriptLoader loads the adsbygoogle.js script
  // lazily on first user interaction; pushes made before that point are
  // queued in the `adsbygoogle` array and processed when the script
  // initialises.
  //
  // Two-layer guard:
  //   1. `data-ads-pushed` is OUR marker, set synchronously, so an effect
  //      re-run (Strict Mode double-invoke, parent re-render, etc.) cannot
  //      enqueue a second push for the same <ins>.
  //   2. `data-adsbygoogle-status` is Google's marker, set asynchronously
  //      after the script fills the slot — covers the case where this
  //      <ins> was filled by a previous push that's still in the queue.
  // Without (1), client-side nav can fire push() before Google's status
  // attribute is set, leading to TagError: "All 'ins' elements in the DOM
  // with class=adsbygoogle already have ads in them".
  useEffect(() => {
    const el = insRef.current;
    if (!el) return;
    if (el.dataset.adsPushed) return;
    if (el.getAttribute("data-adsbygoogle-status")) return;
    el.dataset.adsPushed = "1";
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Race conditions and dev-only double-invokes: safe to ignore.
    }
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
