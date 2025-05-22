import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@components/navbar/Navbar";
import { ThemeProvider } from "./ThemeProvider";
import { SegmentsProvider } from "./SegmentsContext";
import { Toaster } from "react-hot-toast";
import GAnalytics from "./GAnalytics";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: {
    default: "Spin Wheel – Random Name Picker to Decide Winner",
    template: "%s - Spinpapa",
  },
  description:
    "Spinpapa is your custom wheel spinner for a random decision picker. Fill multiple choices or names, spin the wheel to decide a random winner.",
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
      <body className="min-h-screen bg-slate-100 dark:bg-slate-900 font-sans antialiased">
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
        
          <SegmentsProvider>
          <Navbar />
            <div className="grid lg:grid-cols-12 gap-x-2 mt-2 min-h-screen">
              <div className="rounded-xl bg-card mb-2 text-card-foreground grid lg:col-span-9 shadow border">
                {children}
              </div>
              <div className="rounded-xl border bg-card text-card-foreground shadow text-center lg:col-span-3">
                {/* here we will have a ad of Wordpapa */}
                <p className="text-lg">Advertisement</p>
              </div>
            </div>
          </SegmentsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
