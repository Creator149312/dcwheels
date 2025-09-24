import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./ThemeProvider";
import { SegmentsProvider } from "./SegmentsContext";
import { Toaster } from "react-hot-toast";
import GAnalytics from "./GAnalytics";
import LayoutShell from "@components/LayoutShell";
import { LoginPromptProvider } from "./LoginPromptProvider";
import Footer from "@components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: {
    default: "Spinpapa – Explore, Discover, Spin & Decide",
    template: "%s - Spinpapa",
  },
  description:
    "Spinpapa is the social way to explore ideas, discover new options, and let the wheel decide. Create your own spins, share with friends, and pick anything—from dinner plans to big life choices—in a fun, random way.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <GAnalytics />
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="google-site-verification"
          content="jOUYj2ZPgFjwawSzgYTh7nlTcJdWdDCgSczbT1Rk-hQ"
        />
        <meta name="msvalidate.01" content="A8182827FD82081B73F2EB1024F9C2C9" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="min-h-screen dark:bg-slate-950 font-sans antialiased">
        <Toaster />
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
        <Footer />
      </body>
    </html>
  );
}
