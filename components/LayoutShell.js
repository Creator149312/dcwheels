"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Navbar from "@components/navbar/Navbar";
import MobileNavChrome from "@components/MobileNavChrome";
import LeftSidebar from "@components/LeftSidebar";
import AdaptiveLeaderBoardAds from "./ads/AdaptiveLeaderBoardAds";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

// Only needed on lg+ screens — mobile users never download this
const RightSidebar = dynamic(() => import("./RightSidebar"), { ssr: false });

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith("/embed/");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Ensure forward navigation from long feeds always lands at the top of the new page,
  // while preserving scroll restoration on browser Back/Forward navigation.
  useScrollRestoration();

  // Hooks must be declared before any early return (Rules of Hooks)
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (isEmbed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={toggleSidebar} />
      <MobileNavChrome onToggleSidebar={toggleSidebar} />
      <LeftSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="pt-[calc(3.25rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] md:pb-0 md:pt-[52px] md:ml-[72px] xl:ml-60 transition-[margin] duration-200">
        <main className="max-w-[1600px] mx-auto px-0 sm:px-3 lg:px-6 pt-0 pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            <div className="lg:col-span-8 xl:col-span-9">
              <div className="mb-0.5">
                <AdaptiveLeaderBoardAds
                  desktopSlot={"2668822790"}
                  mobileSlot={"8451962089"}
                />
              </div>
              {children}
            </div>

            <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
              <div className="sticky top-28">
                <RightSidebar />
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}