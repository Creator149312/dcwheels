"use client";
import { useEffect } from "react";

// Injects the AdSense script on the first user interaction only.
// No timer fallback — if the user never interacts, no ad script loads.
// The script is async so injecting it mid-load cannot block LCP or parsing.
const AdsScriptLoader = () => {
  useEffect(() => {
    let loaded = false;
    const activityEvents = ["scroll", "pointerdown", "keydown", "touchstart"];
    const opts = { passive: true };

    const removeListeners = () =>
      activityEvents.forEach((ev) =>
        document.removeEventListener(ev, loadAdsScript, opts)
      );

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

    activityEvents.forEach((ev) =>
      document.addEventListener(ev, loadAdsScript, opts)
    );

    return removeListeners;
  }, []);

  return null;
};

export default AdsScriptLoader;
