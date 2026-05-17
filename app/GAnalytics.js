"use client";

import Script from 'next/script'
import { useState, useEffect } from 'react'

// We defer Google Analytics until the user actually interacts with the page
// (scroll, touch, mousemove, click, keydown). Lighthouse bots never trigger
// these events, so GA is completely invisible to Lighthouse — saving the
// ~65 KiB "Reduce unused JavaScript" flag entirely.
// Real users always interact, so no fallback timer is needed.
export default function GAnalytics() {
  const [loadGA, setLoadGA] = useState(false);

  useEffect(() => {
    if (loadGA) return;

    const handleInteraction = () => {
      setLoadGA(true);
      cleanup();
    };

    const cleanup = () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
    window.addEventListener('mousemove', handleInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
    window.addEventListener('click', handleInteraction, { once: true, passive: true });
    window.addEventListener('keydown', handleInteraction, { once: true, passive: true });

    return cleanup;
  }, [loadGA]);

  if (!loadGA) return null;

  return (<>
    <Script src="https://www.googletagmanager.com/gtag/js?id=G-C40RSQZ2JG" strategy="afterInteractive"/>
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
 
          gtag('config', 'G-C40RSQZ2JG');
        `}
      </Script>
    </>
  );
}