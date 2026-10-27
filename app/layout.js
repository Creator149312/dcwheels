import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
import { SegmentsProvider } from "./SegmentsContext";
import dynamic from "next/dynamic";
import LazyToaster from "@components/LazyToaster";
import LayoutShell from "@components/LayoutShell";
import { LoginPromptProvider } from "./LoginPromptProvider";
import ConditionalFooter from "@components/ConditionalFooter";
import { StatsBatchProvider } from "@components/providers/StatsBatchProvider";
import { SavedEntitiesProvider } from "@components/providers/SavedEntitiesProvider";

const GAnalytics = dynamic(() => import("./GAnalytics"), { ssr: false });
const AdsScriptLoader = dynamic(() => import("@components/ads/AdsScriptLoader"), { ssr: false });
const PWAInstallTracker = dynamic(() => import("@components/PWAInstallTracker"), { ssr: false });

export const metadata = {
  title: {
    default: "Spinpapa – Spin, Talk & Decide",
    template: "%s - Spinpapa",
  },
  description:
    "Spinpapa is the social decision hub for fandoms & pop culture. Create custom wheels, build lists, and join the debate. Spin, Talk, and Decide today!",
  icons: {
    icon: [
      { url: "/logo/favicon.ico" },
      { url: "/logo/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/logo/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/logo/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/logo/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
    ],
    other: [
      {
        rel: "icon",
        url: "/logo/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        rel: "icon",
        url: "/logo/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        rel: "mask-icon",
        url: "/logo/logo-mark-512.png",
      },
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google user avatars — shown immediately in Navbar on every page.
            Preconnecting eliminates the TLS handshake cost from the first
            avatar request. All other third-party origins (AdSense, GA, Vercel
            Blob) are deferred / conditional, so preconnecting them wastes a
            TCP slot on every page load and Lighthouse flags them. */}
        <link
          rel="preconnect"
          href="https://lh3.googleusercontent.com"
          crossOrigin="anonymous"
        />
        <meta
          name="p:domain_verify"
          content="1e5650bff903e1c4a1134b724128da29"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased flex flex-col">
        <LazyToaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SegmentsProvider>
            <LoginPromptProvider>
              <StatsBatchProvider>
                <SavedEntitiesProvider>
                  <LayoutShell>{children}</LayoutShell>
                </SavedEntitiesProvider>
              </StatsBatchProvider>
            </LoginPromptProvider>
          </SegmentsProvider>
        </ThemeProvider>
        <ConditionalFooter />
        <GAnalytics />
        <AdsScriptLoader />
        <PWAInstallTracker />
      </body>
    </html>
  );
}
