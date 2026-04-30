"use client";
import { useEffect } from "react";

// Loads the AdSense script in two stages:
//
// Stage 1 - wait for `window.load` (document.readyState === "complete").
//   This ensures the script never competes with above-the-fold resources,
//   LCP images, or the main JS bundle during the critical rendering path.
//
// Stage 2 - inside the load callback, attach short-lived interaction
//   listeners (scroll, pointer, key, touch). The first one that fires
//   triggers the actual script inject. A 4-second timeout (measured from
//   window.load, not from JS mount) acts as a guaranteed fallback for
//   users who don't interact at all.
//
// Why not Next.js `<Script strategy="afterInteractive">`?
//   `afterInteractive` fires at hydration time, which on slow connections
//   can still overlap with LCP. Our two-stage approach defers to after
//   the network is fully idle before even watching for interaction.
const AdsScriptLoader = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

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

    const attachListeners = () => {
      const opts = { once: true, passive: true };
      document.addEventListener("scroll", loadAdsScript, opts);
      document.addEventListener("pointerdown", loadAdsScript, opts);
      document.addEventListener("keydown", loadAdsScript, opts);
      document.addEventListener("touchstart", loadAdsScript, opts);

      // Fallback: 4 seconds after window.load (not after JS mount), which
      // is well past LCP on any reasonable connection.
      return setTimeout(loadAdsScript, 4000);
    };

    let timer;

    if (document.readyState === "complete") {
      // Page already fully loaded (e.g. client-side navigation to this route).
      timer = attachListeners();
    } else {
      // Wait for window.load before attaching interaction listeners.
      const onLoad = () => { timer = attachListeners(); };
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }

    const opts = { once: true, passive: true };
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
