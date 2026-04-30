"use client";
import { useEffect } from "react";

// Loads the AdSense script lazily but with a guaranteed fallback. Each
// <ins> slot is responsible for its own push({}) call (see AdsUnit,
// AdaptiveLeaderBoardAds); pushes made before this loader fires are queued
// in the adsbygoogle array and processed automatically once the script
// initialises.
//
// Trigger strategy:
//   • `scroll` covers passive readers.
//   • `pointerdown` / `keydown` cover tap, click and keyboard interaction.
//   • A 3-second `setTimeout` fallback guarantees ads still load when the
//     user hasn't interacted yet (short pages, mobile users who only read,
//     desktop users who keep the tab in the background). Without this
//     fallback, ad impressions were lost on every “load-and-leave” session.
// `{ once: true, passive: true }` keeps the listeners cheap and self-
// detaching on first fire so they don't block scroll.
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
    document.addEventListener("keydown", loadAdsScript, opts);
    document.addEventListener("touchstart", loadAdsScript, opts);

    // Fallback — ensures we eventually load even with zero interaction.
    // 3s is long enough for above-the-fold content to paint without
    // competing for main-thread time during the initial render burst.
    const timer = setTimeout(loadAdsScript, 3000);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("scroll", loadAdsScript, opts);
      document.removeEventListener("pointerdown", loadAdsScript, opts);
      document.removeEventListener("keydown", loadAdsScript, opts);
      document.removeEventListener("touchstart", loadAdsScript, opts);
    };
  }, []);

  return null;
};

export default AdsScriptLoader;
