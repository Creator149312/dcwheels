"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@components/navbar/Navbar";
import MobileNavChrome from "@components/MobileNavChrome";
import LeftSidebar from "@components/LeftSidebar";
import TagsCarousel from "@components/TagsCarousel";
import RightSidebar from "./RightSidebar";
import AdaptiveLeaderBoardAds from "./ads/AdaptiveLeaderBoardAds";

export default function LayoutShell({ children }) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith("/embed/");
  // /explore renders its own filter chip row; the global TagsCarousel
  // would visually duplicate it (and on desktop both share `top-12` so
  // they fight for the same sticky slot). Hide it on this route only.
  const hideTagsCarousel = pathname?.startsWith("/explore");
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Embed pages: render bare children with no nav/sidebar/ads chrome
  if (isEmbed) {
    return <>{children}</>;
  }

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false); // Helper to explicitly close

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      <Navbar onToggleSidebar={toggleSidebar} />
      <MobileNavChrome onToggleSidebar={toggleSidebar} />

      {/* Pass the close function down */}
      <LeftSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {/* Top padding budget: mobile = 56px header + 40px tags strip + safe-area.
          On routes where the tags strip is hidden, drop the 40px. */}
      <div className={`${hideTagsCarousel ? "pt-[calc(3.5rem+env(safe-area-inset-top))]" : "pt-[calc(5.5rem+env(safe-area-inset-top))]"} pb-[calc(3rem+env(safe-area-inset-bottom))] md:pb-0 md:pt-12 md:ml-16 transition-all duration-300`}>
        {!hideTagsCarousel && (
          <div className="hidden md:block sticky top-12 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
            <TagsCarousel />
          </div>
        )}

        <main className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-8 py-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 xl:col-span-9 animate-in fade-in duration-500">
              <AdaptiveLeaderBoardAds
                desktopSlot={"2668822790"}
                mobileSlot={"8451962089"}
              />
              {children}
            </div>

            <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
              {/* Tighter top offset than before (was top-32) so more of the
                  first sidebar ad is visible above the fold on desktop. */}
              <div className="sticky top-24">
                <RightSidebar />
              </div>
            </aside>
          </div>
        </main>
      </div>

      {/* Removed the local backdrop here as it's now handled inside LeftSidebar component */}
    </div>
  );
}