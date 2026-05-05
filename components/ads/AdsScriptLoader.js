"use client";
import { useEffect } from "react";

// Injects the AdSense script ONLY after user interaction, but protects LCP on slow 
// connections by waiting for window.load before attaching the interaction listeners.
const AdsScriptLoader = () => {
  useEffect(() => {
    let loaded = false;
    const activityEvents = ["scroll", "pointerdown", "keydown", "touchstart", "mousemove"];
    const opts = { passive: true };

    const removeListeners = () => {
      activityEvents.forEach((ev) =>
        document.removeEventListener(ev, handleInteraction, opts)
      );
    };

    function loadAdsScript() {
      if (loaded) return;
      loaded = true;
      removeListeners();

      const script = document.createElement("script");
      script.src =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6746947892342481";
      script.crossOrigin = "anonymous";
      script.async = true;
      document.body.appendChild(script);
    }

    function handleInteraction() {
      // Yield to the main thread to ensure the browser responds to the user's 
      // interaction first (Protects INP - Interaction to Next Paint)
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(loadAdsScript);
      } else {
        setTimeout(loadAdsScript, 0);
      }
    }

    function attachListeners() {
      activityEvents.forEach((ev) =>
        document.addEventListener(ev, handleInteraction, opts)
      );
    }

    if (document.readyState === "complete") {
      attachListeners();
    } else {
      window.addEventListener("load", attachListeners, { once: true });
    }

    return removeListeners;
  }, []);

  return null;
};

export default AdsScriptLoader;
