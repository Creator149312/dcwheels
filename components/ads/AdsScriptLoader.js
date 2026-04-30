"use client";
import { useEffect } from "react";

const AdsScriptLoader = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let loaded = false;
    const ADS_ID = "ca-pub-6746947892342481"; // Replace with your actual ID

    const loadAdsScript = () => {
      if (loaded) return;
      loaded = true;

      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_ID}`;
      script.crossOrigin = "anonymous";
      script.async = true;
      // Use strategy to ensure it doesn't block the parser
      document.head.appendChild(script);
    };

    // 1. Setup Interaction Listeners immediately on mount
    const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    
    const listenerOptions = { once: true, passive: true };

    const handleActivity = () => {
      // Use requestIdleCallback for the actual injection to stay off the main thread
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => loadAdsScript());
      } else {
        loadAdsScript();
      }
      cleanUpListeners();
    };

    const cleanUpListeners = () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, listenerOptions);
      });
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, listenerOptions);
    });

    // 2. Fallback: Load anyway after 3 seconds of idle time or 4 seconds absolute
    // This captures users who might just sit and read without moving
    const fallbackTimer = setTimeout(() => {
       if ("requestIdleCallback" in window) {
          window.requestIdleCallback(() => loadAdsScript());
       } else {
          loadAdsScript();
       }
    }, 4000);

    return () => {
      clearTimeout(fallbackTimer);
      cleanUpListeners();
    };
  }, []);

  return null;
};

export default AdsScriptLoader;