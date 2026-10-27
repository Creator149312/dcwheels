"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLoginPrompt } from "@app/LoginPromptProvider";
import {
  Home,
  HomeIcon,
  Compass,
  Plus,
  X,
  List,
  User,
  UserIcon,
  Menu,
  MessageCircle,
  Disc3,
  Bookmark,
  BookmarkIcon,
  LayoutGrid,
} from "lucide-react";

// SearchBar brings debounce + API fetch logic — only needed on interaction.
const SearchBar = dynamic(() => import("@components/SearchBar"));

const NotificationBell = dynamic(
  () => import("@components/notifications/NotificationBell"),
  { ssr: false }
);

const InlineQuickComposer = dynamic(
  () => import("@components/InlineQuickComposer"),
  { ssr: false }
);

const SCROLL_THRESHOLD = 10;

function BottomNavItem({ href, icon, activeIcon, label, active, onClick, prefetch = true }) {
  const Icon = active && activeIcon ? activeIcon : icon;
  const cls = `flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors active:scale-95 ${
    active ? "text-primary" : "text-muted-foreground"
  }`;

  if (onClick && !href) {
    return (
      <button onClick={onClick} className={cls} aria-label={label}>
        <Icon size={20} />
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link
      href={href || "#"}
      prefetch={prefetch}
      className={cls}
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
    >
      <Icon size={20} />
      <span>{label}</span>
    </Link>
  );
}

export default function MobileNavChrome({ onToggleSidebar }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const openLoginPrompt = useLoginPrompt();

  const [isVisible, setIsVisible] = useState(true);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [mobilePostComposerOpen, setMobilePostComposerOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  const profileUrl = session?.user?.username || session?.user?.name
    ? `/u/${encodeURIComponent((session.user.username || session.user.name).toLowerCase())}`
    : null;

  useEffect(() => {
    const updateVisibility = (currentY) => {
      const delta = currentY - lastScrollYRef.current;

      // Always show when near the top
      if (currentY < 20) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (Math.abs(delta) < SCROLL_THRESHOLD) return;

      // delta > 0 → scrolling DOWN → hide navs
      // delta < 0 → scrolling UP  → show navs
      setIsVisible(delta < 0);
      lastScrollYRef.current = currentY;
    };

    const handleScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        updateVisibility(window.scrollY);
        tickingRef.current = false;
      });
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close library sheet when navigating
  useEffect(() => { 
    setLibraryOpen(false); 
    setCreateSheetOpen(false);
  }, [pathname]);

  const isLibraryActive =
    pathname.startsWith("/uwheels") ||
    pathname.includes("/explore");

  return (
    <>
      {/* ── Top mobile bar ─────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 right-0 z-[70] md:hidden transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-[52px] bg-background/95 backdrop-blur-md border-b border-border relative z-50">
          <div className="h-full px-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 -ml-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-colors"
                aria-label="Open navigation menu"
              >
                <Menu size={22} />
              </button>

              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/logo/spin-wheel-logo.png"
                  alt="logo"
                  width="32"
                  height="32"
                  priority
                  className="h-8 w-8"
                />
                <span className="text-lg font-black tracking-tighter text-foreground uppercase">
                  Spin<span className="text-primary">Papa</span>
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-1 justify-end">
              <div className="flex items-center h-10">
                <NotificationBell />
              </div>

              <div className="flex items-center h-10">
                <SearchBar />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Library sub-sheet ──────────────────────────────────────────── */}
      {libraryOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[65] bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setLibraryOpen(false)}
          />
          {/* Sheet */}
          <div
            className={`fixed bottom-12 left-0 right-0 z-[68] md:hidden bg-card border-t border-border rounded-t-2xl shadow-lg transition-transform duration-300`}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
              <span className="text-sm font-bold text-foreground">{"Library"}</span>
              <button
                onClick={() => setLibraryOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col py-1">
              <Link
                href="/explore"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setLibraryOpen(false)}
              >
                <LayoutGrid size={20} className="text-primary" />
                {"Explore Wheels"}
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ── Create sub-sheet ──────────────────────────────────────────── */}
      {createSheetOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[65] bg-black/30 backdrop-blur-sm md:hidden"
            onClick={() => setCreateSheetOpen(false)}
          />
          {/* Sheet */}
          <div
            className={`fixed bottom-12 left-0 right-0 z-[68] md:hidden bg-card border-t border-border rounded-t-2xl shadow-lg transition-transform duration-300`}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
              <span className="text-sm font-bold text-foreground">{"Create"}</span>
              <button
                onClick={() => setCreateSheetOpen(false)}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col py-1">
              <button
                type="button"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70 text-left w-full"
                onClick={() => {
                  setCreateSheetOpen(false);
                  if (!session?.user) {
                    openLoginPrompt();
                    return;
                  }
                  setMobilePostComposerOpen(true);
                }}
              >
                <MessageCircle size={20} className="text-blue-500" />
                <div className="flex flex-col">
                  <span>{"Post"}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Share thoughts, photos or VS polls</span>
                </div>
              </button>
              <Link
                href="/wheels/create"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setCreateSheetOpen(false)}
              >
                <Disc3 size={20} className="text-primary" />
                <div className="flex flex-col">
                  <span>{"Wheel"}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Spin wheel for random picks</span>
                </div>
              </Link>
              <Link
                href="/lists/create"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setCreateSheetOpen(false)}
              >
                <List size={20} className="text-violet-500" />
                <div className="flex flex-col">
                  <span>{"List"}</span>
                  <span className="text-[11px] font-normal text-muted-foreground">Curate rankings, favorites & tier lists</span>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}



      {/* ── Bottom nav ─────────────────────────────────────────────────── */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[70] md:hidden border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* h-12 = 48px — sleek but keeps 44px minimum tap target per HIG */}
        <div className="h-12 px-2 grid grid-cols-5 items-center">
          <BottomNavItem
            href="/"
            label="Home"
            icon={Home}
            activeIcon={HomeIcon}
            active={pathname === "/"}
            onClick={() => { setLibraryOpen(false); setCreateSheetOpen(false); }}
          />

          <BottomNavItem
            href="/explore"
            label="Explore"
            icon={Compass}
            active={pathname.startsWith("/explore")}
            onClick={() => { setLibraryOpen(false); setCreateSheetOpen(false); }}
          />

          <button
            onClick={() => {
              setLibraryOpen(false);
              setCreateSheetOpen((v) => !v);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-all ${
              createSheetOpen ? "text-primary scale-110" : "text-muted-foreground hover:text-primary"
            }`}
            aria-label={createSheetOpen ? "Close" : "Create"}
          >
            <div className={`p-1.5 rounded-full transition-colors ${createSheetOpen ? "bg-primary text-primary-foreground rotate-45" : "bg-muted"}`}>
              {createSheetOpen ? <X size={20} /> : <Plus size={20} />}
            </div>
            <span>{createSheetOpen ? "Close" : "Create"}</span>
          </button>

          <BottomNavItem
            href={profileUrl ? `${profileUrl}/saved` : "/login"}
            label="Saved"
            icon={Bookmark}
            activeIcon={BookmarkIcon}
            active={pathname.endsWith("/saved")}
            onClick={() => { setLibraryOpen(false); setCreateSheetOpen(false); }}
          />

          <BottomNavItem
            href={profileUrl || "/login"}
            label="Profile"
            icon={User}
            activeIcon={UserIcon}
            active={pathname.startsWith("/u/") || pathname.startsWith("/profile")}
            onClick={() => { setLibraryOpen(false); setCreateSheetOpen(false); }}
          />
        </div>
      </nav>

      {/* Mobile Post Composer Bottom Sheet / Modal */}
      {mobilePostComposerOpen && (
        <InlineQuickComposer
          mode="modal"
          onClose={() => setMobilePostComposerOpen(false)}
        />
      )}
    </>
  );
}