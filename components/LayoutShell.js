"use client";

import { useState } from "react";
import Navbar from "@components/navbar/Navbar";
import LeftSidebar from "@components/LeftSidebar";
import TagsCarousel from "@components/TagsCarousel";

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
          <div className="lg:col-span-3">{/* Ad space */}</div>
        </div>
      </div>
    </>
  );
}
