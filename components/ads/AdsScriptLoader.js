"use client";
import { useEffect } from "react";

const AdsScriptLoader = () => {
  let scriptLoaded = false;
  useEffect(() => {
    if (typeof document !== "undefined") {
      const adElements = document.querySelectorAll(".adsbygoogle"); // Select all ad slots

      const isMobile = () => /Mobi|Android/i.test(navigator.userAgent);

      const loadAdsScript = () => {
        const script = document.createElement("script");
        script.src =
          "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6746947892342481";
        script.crossorigin = "anonymous";
        script.async = true;
        script.onload = () => {
          //if it is desktop device we load ads after script is loaded
          var ads = document.getElementsByClassName("adsbygoogle").length;
          for (var i = 0; i < ads; i++) {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
            } catch (e) {}
          }

          scriptLoaded = true;
        };
        document.body.appendChild(script);
      };

      const handleInteraction = () => {
        // clearTimeout(timeoutId);
        if (!scriptLoaded) {
          loadAdsScript();
        }
      };

      if (isMobile()) {
        document.addEventListener("scroll", handleInteraction);
        document.addEventListener("touchstart", handleInteraction);
      } else {
        const events = [
          "mousemove",
          "click",
          "scroll",
          "keypress",
          "touchstart",
        ];
        events.forEach((event) => {
          document.addEventListener(event, handleInteraction);
        });
      }

      return () => {
        if (isMobile()) {
          document.removeEventListener("scroll", handleInteraction);
          document.removeEventListener("touchstart", handleInteraction);
        } else {
          const events = [
            "mousemove",
            "click",
            "scroll",
            "keypress",
            "touchstart",
          ];
          events.forEach((event) => {
            document.removeEventListener(event, handleInteraction);
          });
        }
      };
    }
  }, []);

  return (
    <div></div>
  );
};

export default AdsScriptLoader;
