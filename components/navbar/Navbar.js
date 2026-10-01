"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { PanelLeft } from "lucide-react";

const NotificationBell = dynamic(
  () => import("@components/notifications/NotificationBell"),
  { ssr: false }
);

const UserInfo = dynamic(
  () => import("@components/UserInfo"),
  { ssr: false }
);

const SearchBar = dynamic(
  () => import("@components/SearchBar")
);

const Navbar = ({ onToggleSidebar }) => {
  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 z-[60] h-[52px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border transition-colors duration-300">
      <div className="h-full max-w-[1800px] mx-auto flex items-center justify-between px-3 md:px-6">

        {/* Left: Sidebar Toggle & Logo */}
        <div className="flex items-center gap-2 md:gap-4 lg:pr-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Open menu"
          >
            <PanelLeft size={22} />
          </button>

          <Link href="/" className="flex items-center group gap-2">
            <Image
              src="/spin-wheel-logo.png"
              alt="logo"
              width="36"
              height="36"
              priority
              className="h-8 w-8 md:h-9 md:w-9"
            />
            <span className="text-lg md:text-xl font-black tracking-tighter text-foreground uppercase">
              Spin<span className="text-primary">Papa</span>
            </span>
          </Link>
        </div>

        {/* Center: Search (Desktop Only) */}
        <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8">
          <div className="w-full max-w-xl">
            <SearchBar />
          </div>
        </div>

        {/* Right Side Actions: Notifications & User Auth */}
        <div className="flex items-center gap-2 md:gap-3 justify-end relative z-[80]">
          <NotificationBell />
          <UserInfo />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
