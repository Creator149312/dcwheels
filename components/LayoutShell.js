"use client";

import { useState } from "react";
import Navbar from "@components/navbar/Navbar";
import MobileNavChrome from "@components/MobileNavChrome";
import LeftSidebar from "@components/LeftSidebar";
import TagsCarousel from "@components/TagsCarousel";
import RightSidebar from "./RightSidebar";
import AdaptiveLeaderBoardAds from "./ads/AdaptiveLeaderBoardAds";

export default function LayoutShell({ children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false); // Helper to explicitly close

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      <Navbar onToggleSidebar={toggleSidebar} />
      <MobileNavChrome onToggleSidebar={toggleSidebar} />

      {/* Pass the close function down */}
      <LeftSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="pt-[calc(6rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0 md:pt-14 md:ml-20 transition-all duration-300">
        <div className="hidden md:block sticky top-14 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
          <TagsCarousel />
        </div>

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
              <div className="sticky top-32">
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
// "use client";

// import { useState } from "react";
// import Navbar from "@components/navbar/Navbar";
// import LeftSidebar from "@components/LeftSidebar";
// import TagsCarousel from "@components/TagsCarousel";
// import RightSidebar from "./RightSidebar";

// export default function LayoutShell({ children }) {
//   const [isSidebarOpen, setSidebarOpen] = useState(false);

//   const toggleSidebar = () => setSidebarOpen((prev) => !prev);

//   return (
//     <>
//       <Navbar onToggleSidebar={toggleSidebar} />
//       <LeftSidebar isOpen={isSidebarOpen} />
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black bg-opacity-40 z-40"
//           onClick={toggleSidebar}
//         />
//       )}
//       <div className="pt-16 md:pl-16">
//         <TagsCarousel />
//         <div className="grid lg:grid-cols-12 gap-x-2 mt-2 min-h-screen">
//           <div className="lg:col-span-9">{children}</div>
//           <div className="lg:col-span-3">
//             <RightSidebar />
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
