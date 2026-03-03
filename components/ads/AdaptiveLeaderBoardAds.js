"use client";
import { useState, useEffect } from "react";

export default function AdaptiveLeaderBoardAds({ desktopSlot, mobileSlot }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check screen size on mount
    const checkSize = () => setIsMobile(window.innerWidth < 640);
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  return (
    <div className="w-full bg-gray-50/50 dark:bg-gray-900/30 border border-dashed border-gray-200 dark:border-gray-800 rounded-[2rem] flex flex-col items-center justify-center transition-all">
      <div className="w-full max-w-[728px] h-[100px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm mx-auto overflow-hidden">
        
        {isMobile ? (
          /* Mobile Ad - 320x50 fits perfectly in your 100px height */
          <ins
            className="adsbygoogle"
            style={{ display: "inline-block", width: "320px", height: "50px" }}
            data-ad-client="ca-pub-6746947892342481"
            data-ad-slot={mobileSlot}
          />
        ) : (
          /* Desktop Ad - 728x90 fits perfectly in your 100px height */
          <ins
            className="adsbygoogle"
            style={{ display: "inline-block", width: "728px", height: "90px" }}
            data-ad-client="ca-pub-6746947892342481"
            data-ad-slot={desktopSlot}
          />
        )}

      </div>
      {/* <span className="text-[9px] text-gray-400 mt-1 uppercase tracking-widest font-medium">
        Advertisement
      </span> */}
    </div>
  );
}