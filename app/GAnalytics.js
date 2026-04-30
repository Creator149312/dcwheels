import Script from 'next/script'

// `lazyOnload` waits until after the browser fires `load` (i.e. after LCP,
// after all initial network activity is idle) before injecting the GA tag.
// `afterInteractive` runs at hydration time, which on slow mobile can still
// overlap with the LCP window. Analytics never affects user-visible UI, so
// pushing it to `lazyOnload` is a free LCP/INP win.
export default function GAnalytics() {
  return (<>
    <Script src="https://www.googletagmanager.com/gtag/js?id=G-C40RSQZ2JG" strategy="lazyOnload"/>
      <Script id="google-analytics"  strategy="lazyOnload">
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