"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Compass, PlusCircle, Library, LayoutGrid, List, User, Moon, Sun, Menu, X, MessageCircle, Disc3 } from "lucide-react";

// TagsCarousel has seasonal logic, scroll refs and useMemo — lazy-load so it
// doesn't block the initial mobile nav chunk.
const TagsCarousel = dynamic(() => import("@components/TagsCarousel"));

// MobileSearchBar brings debounce + API fetch logic — only needed on interaction.
const MobileSearchBar = dynamic(() => import("@components/MobileSearchBar"));

const SCROLL_THRESHOLD = 10;

function BottomNavItem({ href, icon, label, active, onClick }) {
  const pathname = usePathname();
  const cls = `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
    active ? "text-primary" : "text-muted-foreground"
  }`;

  if (onClick && !href) {
    return (
      <button onClick={onClick} className={cls} aria-label={label}>
        {icon}
        <span>{label}</span>
      </button>
    );
  }

  return (
    <Link 
      href={href || "#"} 
      className={cls}
      onClick={(e) => {
        if (onClick) onClick(e);
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function MobileNavChrome({ onToggleSidebar }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { resolvedTheme, setTheme } = useTheme();

  const [isVisible, setIsVisible] = useState(true);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);
  
  const profileUrl = session?.user?.username || session?.user?.name
    ? `/u/${encodeURIComponent((session.user.username || session.user.name).toLowerCase())}`
    : null;

  const isDark = resolvedTheme === "dark";

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

  useEffect(() => { setMounted(true); }, []);

  // Close library sheet when navigating
  useEffect(() => { 
    setLibraryOpen(false); 
    setCreateSheetOpen(false);
  }, [pathname]);

  const isLibraryActive =
    pathname.startsWith("/wheels") ||
    pathname.startsWith("/uwheels") ||
    pathname.startsWith("/lists");

  return (
    <>
      {/* ── Top mobile bar ─────────────────────────────────────────────── */}
      <div
        className={`fixed top-0 left-0 right-0 z-[70] md:hidden transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="h-14 bg-background/95 backdrop-blur-md border-b border-border relative z-50">
          <div className="h-full px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                aria-label="Open Menu"
              >
                <Menu size={20} />
              </button>

              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/spin-wheel-logo.png"
                  alt="logo"
                  width="32"
                  height="32"
                  priority
                  className="h-8 w-8"
                />
                  <span className="text-lg font-black tracking-tighter text-foreground uppercase">
                  Spin<span className="text-blue-600">Papa</span>
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted"
                aria-label={"Toggle Theme"}
              >
                {mounted ? (isDark ? <Sun size={20} /> : <Moon size={20} />) : <Moon size={20} className="opacity-0" />}
              </button>

              <MobileSearchBar />
            </div>
          </div>
        </div>

        {/* /explore renders its own mood chip row; suppress the global tag
            carousel on that route to avoid two stacked chip rows. */}
        {!pathname.startsWith("/explore") && (
          <div className="h-11 bg-background/95 backdrop-blur-md border-b border-border">
            <TagsCarousel />
          </div>
        )}
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
                href="/wheels"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setLibraryOpen(false)}
              >
                <LayoutGrid size={20} className="text-primary" />
                {"Wheels"}
              </Link>
              <Link
                href="/lists"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setLibraryOpen(false)}
              >
                <List size={20} className="text-primary" />
                {"Lists"}
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
              <Link
                href="/post/create"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setCreateSheetOpen(false)}
              >
                <MessageCircle size={20} className="text-blue-500" />
                {"Post"}
              </Link>
              <Link
                href="/wheels/create"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setCreateSheetOpen(false)}
              >
                <Disc3 size={20} className="text-primary" />
                {"Wheel"}
              </Link>
              <Link
                href="/lists/create"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted active:bg-muted/70"
                onClick={() => setCreateSheetOpen(false)}
              >
                <List size={20} className="text-violet-500" />
                {"List"}
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
            label={"Home"}
            icon={<Home size={18} />}
            active={pathname === "/"}
            onClick={() => { setLibraryOpen(false); setCreateSheetOpen(false); }}
          />

          <BottomNavItem
            href="/explore"
            label={"Explore"}
            icon={<Compass size={18} />}
            active={pathname.startsWith("/explore")}
            onClick={() => { setLibraryOpen(false); setCreateSheetOpen(false); }}
          />

          <button
            onClick={() => {
              setLibraryOpen(false);
              setCreateSheetOpen((v) => !v);
            }}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              createSheetOpen ? "text-primary" : "text-blue-600 dark:text-blue-400"
            }`}
            aria-label={"Create"}
          >
            <PlusCircle size={22} />
            <span>{"Create"}</span>
          </button>

          <BottomNavItem
            label={"Browse"}
            icon={<Library size={18} />}
            active={isLibraryActive || libraryOpen}
            onClick={() => {
              setCreateSheetOpen(false);
              setLibraryOpen((v) => !v);
            }}
          />

          <BottomNavItem
            href={profileUrl || "/login"}
            label={"Profile"}
            icon={<User size={18} />}
            active={pathname.startsWith("/u/") || pathname.startsWith("/profile") || pathname.startsWith("/dashboard")}
            onClick={() => { setLibraryOpen(false); setCreateSheetOpen(false); }}
          />
        </div>
      </nav>
    </>
  );
}