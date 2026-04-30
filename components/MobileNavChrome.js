"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Compass, PlusCircle, Library, LayoutGrid, List, User, Bell, Moon, Sun, Menu, X } from "lucide-react";
import TagsCarousel from "@components/TagsCarousel";
import MobileSearchBar from "@components/MobileSearchBar";

// CreateWheelModal is heavy (segment editor + image upload deps) and only
// rendered after the user taps the + button. Lazy-loading it keeps the
// mobile nav chunk — which ships on every page — lean.
const CreateWheelModal = dynamic(
  () => import("@components/CreateWheelModal"),
  { ssr: false }
);

const SCROLL_THRESHOLD = 10;

function BottomNavItem({ href, icon, label, active, onClick }) {
  const cls = `flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
    active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
  }`;
  if (onClick) {
    return (
      <button onClick={onClick} className={cls} aria-label={label}>
        {icon}
        <span>{label}</span>
      </button>
    );
  }
  return (
    <Link href={href} className={cls}>
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export default function MobileNavChrome({ onToggleSidebar }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

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
  useEffect(() => { setLibraryOpen(false); }, [pathname]);

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
        <div className="h-14 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100/80 dark:border-gray-900/80">
          <div className="h-full px-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleSidebar}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Open menu"
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
                <span className="text-lg font-black tracking-tighter text-gray-900 dark:text-white uppercase">
                  Spin<span className="text-blue-600">Papa</span>
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Toggle theme"
              >
                {mounted ? (isDark ? <Sun size={20} /> : <Moon size={20} />) : <Moon size={20} className="opacity-0" />}
              </button>

              <Link
                href="/dashboard"
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Dashboard"
              >
                <Bell size={20} />
              </Link>

              <MobileSearchBar />
            </div>
          </div>
        </div>

        {/* /explore renders its own mood chip row; suppress the global tag
            carousel on that route to avoid two stacked chip rows. */}
        {!pathname.startsWith("/explore") && (
          <div className="h-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100/80 dark:border-gray-900/80">
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
            className={`fixed bottom-12 left-0 right-0 z-[68] md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 rounded-t-2xl shadow-2xl transition-transform duration-300`}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Browse</span>
              <button
                onClick={() => setLibraryOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col py-1">
              <Link
                href="/wheels"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100"
                onClick={() => setLibraryOpen(false)}
              >
                <LayoutGrid size={20} className="text-blue-500" />
                Browse Wheels
              </Link>
              <Link
                href="/lists"
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100"
                onClick={() => setLibraryOpen(false)}
              >
                <List size={20} className="text-indigo-500" />
                My Lists
              </Link>
            </div>
          </div>
        </>
      )}

      {/* ── Bottom nav ─────────────────────────────────────────────────── */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[70] md:hidden border-t border-gray-100/80 dark:border-gray-900/80 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)] transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* h-12 = 48px — sleek but keeps 44px minimum tap target per HIG */}
        <div className="h-12 px-2 grid grid-cols-5 items-center">
          <BottomNavItem
            href="/"
            label="Home"
            icon={<Home size={18} />}
            active={pathname === "/"}
          />

          <BottomNavItem
            href="/explore"
            label="Explore"
            icon={<Compass size={18} />}
            active={pathname.startsWith("/explore")}
          />

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
            aria-label="Create"
          >
            <PlusCircle size={22} />
            <span>Create</span>
          </button>

          <BottomNavItem
            label="Browse"
            icon={<Library size={18} />}
            active={isLibraryActive || libraryOpen}
            onClick={() => setLibraryOpen((v) => !v)}
          />

          <BottomNavItem
            href="/dashboard"
            label="Profile"
            icon={<User size={18} />}
            active={pathname.startsWith("/dashboard") || pathname.startsWith("/profile")}
          />
        </div>
      </nav>

      <CreateWheelModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </>
  );
}