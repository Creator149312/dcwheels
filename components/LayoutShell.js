"use client";

import { useState } from "react";
import Navbar from "@components/navbar/Navbar";
import LeftSidebar from "@components/LeftSidebar";
import TagsCarousel from "@components/TagsCarousel";
import RightSidebar from "./RightSidebar";

export default function LayoutShell({ children }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <>
      <Navbar onToggleSidebar={toggleSidebar} />
      <LeftSidebar isOpen={isSidebarOpen} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={toggleSidebar}
        />
      )}
      <div className="pt-16 md:pl-16">
        <TagsCarousel />
        <div className="grid lg:grid-cols-12 gap-x-2 mt-2 min-h-screen">
          <div className="lg:col-span-9">{children}</div>
          <div className="lg:col-span-3">
            <RightSidebar
              pageIds={["6814a1e18497d7da7a37ec87", "67b5f7c078963433d87b65a6", "67b5f7b478963433d87b6594", "681b9de80c59107ff42b0d08", "6825d7722cd9a2d5410fcdc7", "67b5ec81ecbc3233f7d16b27", "68360635fe9c4171a19c7104", "6845fac52f8cb7ad225a6655", "683ad8c24a1befb9dce36f83"]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
