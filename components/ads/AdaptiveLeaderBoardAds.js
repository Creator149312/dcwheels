"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Single <ins> slot with self-push. Lives inside both the mobile and
// desktop branches below. The push effect uses the same two-layer guard
// + idle-time scheduling + ResizeObserver pattern as AdsUnit.js — see
// that file for the full rationale.
//
// CSS-driven visibility note:
//   The hidden variant (e.g. desktop branch on a phone) has
//   `display: none` via Tailwind's `hidden` class, so its <ins> reports
//   `offsetWidth === 0`. Our `tryPush` guard skips it. ResizeObserver
//   never fires for a `display:none` element, so the hidden variant
//   stays unpushed — no slot is burned, no TagError thrown. When the
//   breakpoint crosses, the newly-revealed branch's ResizeObserver fires
//   exactly once and pushes.
function AdSlot({ slot, width, height, className }) {
  const insRef = useRef(null);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    const doPush = () => {
      if (!el.isConnected) return;
      if (el.dataset.adsPushed) return;
      if (el.getAttribute("data-adsbygoogle-status")) return;
      if (el.offsetWidth === 0) return;
      el.dataset.adsPushed = "1";
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // Race conditions and dev-only double-invokes: safe to ignore.
      }
    };

    const schedulePush = () => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(doPush, { timeout: 2000 });
      } else {
        setTimeout(doPush, 0);
      }
    };

    const tryPush = () => {
      if (!el.isConnected) return false;
      if (el.dataset.adsPushed) return true;
      if (el.getAttribute("data-adsbygoogle-status")) return true;
      if (el.offsetWidth === 0) return false;
      schedulePush();
      el.dataset.adsPushed = "1";
      return true;
    };

    if (tryPush()) return;

    const ro = new ResizeObserver(() => {
      if (tryPush()) ro.disconnect();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle ${className || ""}`}
      style={{ display: "inline-block", width: `${width}px`, height: `${height}px` }}
      data-ad-client="ca-pub-6746947892342481"
      data-ad-slot={slot}
    />
  );
}

function AdaptiveLeaderBoardAdsInner({ desktopSlot, mobileSlot }) {
  // Render BOTH variants, control visibility with CSS (`hidden sm:block`).
  // This eliminates the JS-driven layout shift that occurred when the old
  // `useState(isMobile)` first rendered the desktop card on a phone, then
  // flipped to mobile after hydration. Now SSR + hydration agree from the
  // first paint, and the breakpoint switch is pure CSS — zero CLS.
  //
  // The `display:none` branch's <ins> has zero width, so its push() guard
  // skips it (see AdSlot above). Only the visible variant ever pushes.
  return (
    <div className="w-full my-2">
      {/* Mobile: visible below sm (640px) — bare 320×50 banner. */}
      <div className="flex justify-center overflow-hidden sm:hidden">
        <AdSlot slot={mobileSlot} width={320} height={50} />
      </div>

      {/* Desktop: visible from sm up — card-style 728×90 leaderboard. */}
      <div className="hidden sm:flex w-full bg-gray-50/50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl items-center justify-center overflow-hidden">
        <div className="w-full max-w-[728px] h-[100px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm mx-auto overflow-hidden">
          <AdSlot slot={desktopSlot} width={728} height={90} />
        </div>
      </div>
    </div>
  );
}

export default function AdaptiveLeaderBoardAds(props) {
  // LayoutShell renders this above {children}, so it persists across <Link>
  // navigations. Re-key on pathname so each route gets a fresh <ins> +
  // adsbygoogle.push() instead of holding the first page's ad forever.
  const pathname = usePathname();
  return (
    <AdaptiveLeaderBoardAdsInner
      key={`${pathname}:${props.desktopSlot}:${props.mobileSlot}`}
      {...props}
    />
  );
}
