import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
import { SegmentsProvider } from "./SegmentsContext";
import LazyToaster from "@components/LazyToaster";
import GAnalytics from "./GAnalytics";
import LayoutShell from "@components/LayoutShell";
import { LoginPromptProvider } from "./LoginPromptProvider";
import ConditionalFooter from "@components/ConditionalFooter";
import AdsScriptLoader from "@components/ads/AdsScriptLoader";
import { LocaleProvider } from "@components/providers/LocaleProvider";

export const metadata = {
  title: {
    default: "Spinpapa – Explore, Discover, Spin Wheel & Decide",
    template: "%s - Spinpapa",
  },
  description:
    "Spinpapa is the social way to explore ideas, discover new options, and let the wheel decide. Create your own spins, share with friends, and pick anything—from dinner plans to big life choices—in a fun, random way.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
    other: [
      { rel: "icon", url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Spinpapa",
  },
  verification: {
    google: "jOUYj2ZPgFjwawSzgYTh7nlTcJdWdDCgSczbT1Rk-hQ",
    other: { "msvalidate.01": "A8182827FD82081B73F2EB1024F9C2C9" },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1.0,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect and dns-prefetch for external image CDNs and analytics */}

        {/* Priority 1: Your own assets */}
        <link
          rel="preconnect"
          href="https://kwxy9wjctsgcpn5g.public.blob.vercel-storage.com"
          crossOrigin="anonymous"
        />

        {/* Priority 2: AdSense (The "Pipes") */}
        <link
          rel="preconnect"
          href="https://pagead2.googlesyndication.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://googleads.g.doubleclick.net"
          crossOrigin="anonymous"
        />

        {/* Priority 3: DNS Prefetch as a secondary fallback */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className="min-h-screen dark:bg-slate-950 font-sans antialiased">
        <LocaleProvider>
          <LazyToaster />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SegmentsProvider>
              <LoginPromptProvider>
                <LayoutShell>{children}</LayoutShell>
              </LoginPromptProvider>
            </SegmentsProvider>
          </ThemeProvider>
          <ConditionalFooter />
          <GAnalytics />
          <AdsScriptLoader />
        </LocaleProvider>
      </body>
    </html>
  );
}
