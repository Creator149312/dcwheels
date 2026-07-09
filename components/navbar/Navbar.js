"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PlusCircle, ChevronDown, Compass, Library, List, Disc3, PanelLeft, MessageCircle, Bookmark } from "lucide-react";

const NotificationBell = dynamic(
  () => import("@components/notifications/NotificationBell"),
  { ssr: false }
);

// UserInfo manages its own session state now. We skip SSR to prevent hydration
// mismatch on the authenticated vs unauthenticated UI button state.
const UserInfo = dynamic(
  () => import("@components/UserInfo"),
  { ssr: false, loading: () => <div className="h-9 w-9 sm:w-10 sm:h-10 bg-muted rounded-full animate-pulse" /> }
);

// MobileSearchBar brings in the API fetch logic, extra states, and lucide icons.
// We can dynamically load it so it doesn't block the initial layout frame.
const MobileSearchBar = dynamic(
  () => import("@components/MobileSearchBar")
);

const Navbar = ({ onToggleSidebar }) => {
  const { data: session } = useSession();
  const username = session?.user?.username || session?.user?.name;
  const savedUrl = username ? `/u/${encodeURIComponent(username.toLowerCase())}/saved` : null;

  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 z-[60] h-14 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border transition-colors duration-300">
      <div className="h-full max-w-[1800px] mx-auto flex items-center justify-between px-3 md:px-6">
        
        {/* Left: Sidebar Toggle & Logo */}
        <div className="flex items-center gap-2 md:gap-4 lg:pr-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label={"Open menu"}
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
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          <MobileSearchBar />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 md:gap-6">
          {/* Mobile Search Icon Trigger */}
          <div className="md:hidden">
            <MobileSearchBar />
          </div>

          {/* RESTORED: Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-0.5">
            {/* Create Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                <PlusCircle size={18} />
                <span>Create</span>
                <ChevronDown size={14} className="group-hover:rotate-180 transition-transform duration-200 opacity-70" />
              </button>

              <div className="absolute top-full left-0 pt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-200 z-[70]">
                <div className="bg-popover border border-border shadow-md rounded-xl p-1.5 flex flex-col">
                  <Link href="/post/create" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                    <MessageCircle size={16} /> Post
                  </Link>
                  <Link href="/wheels/create" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                    <Disc3 size={16} /> Wheel
                  </Link>
                  <Link href="/lists/create" className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left">
                    <List size={16} /> List
                  </Link>
                </div>
              </div>
            </div>

            <Link
              href="/explore"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Compass size={18} />
              <span>Explore</span>
            </Link>

            {savedUrl && (
              <Link
                href={savedUrl}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <Bookmark size={18} />
                <span>Saved</span>
              </Link>
            )}
          </div>

          <div className="hidden md:block h-6 w-[1px] bg-border mx-1" />

          {/* User Section */}
          <div className="flex items-center gap-3 relative z-[80]">
             <NotificationBell />
             <UserInfo />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
