"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Navbar from "@components/navbar/Navbar";
import MobileNavChrome from "@components/MobileNavChrome";
import LeftSidebar from "@components/LeftSidebar";
import TagsCarousel from "@components/TagsCarousel";
import AdaptiveLeaderBoardAds from "./ads/AdaptiveLeaderBoardAds";

// Only needed on lg+ screens — mobile users never download this
const RightSidebar = dynamic(() => import("./RightSidebar"), { ssr: false });

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith("/embed/");
  const hideTagsCarousel = pathname?.startsWith("/explore");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Hooks must be declared before any early return (Rules of Hooks)
  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const contentPadding = hideTagsCarousel
    ? "pt-[calc(3.25rem+env(safe-area-inset-top))]"
    : "pt-[calc(5.5rem+env(safe-area-inset-top))]";

  if (isEmbed) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar onToggleSidebar={toggleSidebar} />
      <MobileNavChrome onToggleSidebar={toggleSidebar} />
      <LeftSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className={`${contentPadding} pb-[calc(3rem+env(safe-area-inset-bottom))] md:pb-0 md:pt-[52px] md:ml-16`}>
        {!hideTagsCarousel && (
          <div className="hidden md:block sticky top-[52px] z-30 bg-background/95 backdrop-blur-md border-b border-border/40 py-1 px-3">
            <TagsCarousel />
          </div>
        )}

        <main className="max-w-[1600px] mx-auto px-0 sm:px-4 lg:px-8 pt-0 pb-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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