"use client";
import { useEffect } from "react";

// Loads the AdSense script lazily on first user intent. Each <ins> slot
// is responsible for its own push({}) call (see AdsUnit, AdaptiveLeaderBoardAds);
// pushes made before this loader fires are queued in the adsbygoogle array
// and processed automatically once the script initialises.
//
// Listener strategy: `scroll` covers passive readers, `pointerdown` covers
// tap/click on any pointer device. `mousemove` was intentionally dropped —
// it fires constantly and burns CPU during the most TBT-sensitive window.
// `{ once: true, passive: true }` means the listeners self-detach on first
// fire and don't block scroll.
const AdsScriptLoader = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let loaded = false;
    const loadAdsScript = () => {
      if (loaded) return;
      loaded = true;

      const script = document.createElement("script");
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6746947892342481";
      script.crossOrigin = "anonymous";
      script.async = true;
      document.body.appendChild(script);
    };

    const opts = { once: true, passive: true };
    document.addEventListener("scroll", loadAdsScript, opts);
    document.addEventListener("pointerdown", loadAdsScript, opts);

    return () => {
      document.removeEventListener("scroll", loadAdsScript, opts);
      document.removeEventListener("pointerdown", loadAdsScript, opts);
    };
  }, []);

  return null;
};

export default AdsScriptLoader;
