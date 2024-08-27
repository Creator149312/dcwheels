import Script from 'next/script'

export default function GAnalytics() {
  return (<>
    <Script src="https://www.googletagmanager.com/gtag/js?id=G-C40RSQZ2JG" strategy="afterInteractive"/>
      <Script id="google-analytics"  strategy="afterInteractive">
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