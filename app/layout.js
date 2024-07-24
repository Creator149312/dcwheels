import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@components/navbar/Navbar";
import { ThemeProvider } from "./ThemeProvider";
import SearchBarNav from "@components/SearchNavBar";
import { SegmentsProvider } from "./SegmentsContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SpinPapa ",
  description: "Create Your Spin Wheel and make decision",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Toaster />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* <NavbarAdv /> */}
          <Navbar />
          {/* <SearchBarNav /> */}
          <SegmentsProvider>
            <div className="grid md:grid-cols-12 gap-x-2 m-2 min-h-screen">
              <div className="bg-card text-card-foreground md:m-2 mb-2 p-2 grid md:col-span-9 rounded-xl shadow border">
                {children}
              </div>
              <div className="rounded-xl border bg-card text-card-foreground shadow md:m-2 mb-2 mt-2 md:col-span-3">
                This is the sidebar It will contain the ads
              </div>
            </div>
          </SegmentsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
