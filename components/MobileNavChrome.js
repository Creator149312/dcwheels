"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Home, Compass, PlusCircle, Library, User, Bell, Moon, Sun, Menu } from "lucide-react";
import TagsCarousel from "@components/TagsCarousel";
import MobileSearchBar from "@components/MobileSearchBar";
import CreateWheelModal from "@components/CreateWheelModal";

const SCROLL_THRESHOLD = 10;

function BottomNavItem({ href, icon, label, active }) {
  return (
    <a
      href={href}
      className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
        active ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"
      }`}
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}

export default function MobileNavChrome({ onToggleSidebar }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastScrollYRef = useRef(0);
  const tickingRef = useRef(false);

  const isDark = resolvedTheme === "dark";

  const items = useMemo(
    () => [
      { href: "/", label: "Home", icon: <Home size={20} /> },
      { href: "/games", label: "Explore", icon: <Compass size={20} /> },
      { href: "/lists", label: "Library", icon: <Library size={20} /> },
      { href: "/profile", label: "Profile", icon: <User size={20} /> },
    ],
    []
  );

  useEffect(() => {
    const updateVisibility = (currentY) => {
      const delta = currentY - lastScrollYRef.current;

      if (currentY < 20) {
        setIsVisible(true);
        lastScrollYRef.current = currentY;
        return;
      }

      if (Math.abs(delta) < SCROLL_THRESHOLD) {
        return;
      }

      // Requested behavior: hide while scrolling up, show while scrolling down.
      if (delta < 0) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

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

  return (
    <>
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

              <a href="/" className="flex items-center gap-2">
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
              </a>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Toggle theme"
              >
                {/* Render a neutral placeholder until theme is known on client */}
                {mounted ? (isDark ? <Sun size={20} /> : <Moon size={20} />) : <Moon size={20} className="opacity-0" />}
              </button>

              <a
                href="/dashboard"
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Notifications"
              >
                <Bell size={20} />
              </a>

              <MobileSearchBar />
            </div>
          </div>
        </div>

        <div className="h-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-gray-100/80 dark:border-gray-900/80">
          <TagsCarousel />
        </div>
      </div>

      <nav
        className={`fixed bottom-0 left-0 right-0 z-[70] md:hidden border-t border-gray-100/80 dark:border-gray-900/80 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md shadow-[0_-6px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="h-16 px-2 grid grid-cols-5 items-center">
          <BottomNavItem
            href={items[0].href}
            label={items[0].label}
            icon={items[0].icon}
            active={pathname === items[0].href}
          />

          <BottomNavItem
            href={items[1].href}
            label={items[1].label}
            icon={items[1].icon}
            active={pathname.startsWith(items[1].href)}
          />

          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400"
            aria-label="Create"
          >
            <PlusCircle size={26} />
            <span>Create</span>
          </button>

          <BottomNavItem
            href={items[2].href}
            label={items[2].label}
            icon={items[2].icon}
            active={pathname.startsWith(items[2].href)}
          />

          <BottomNavItem
            href={items[3].href}
            label={items[3].label}
            icon={items[3].icon}
            active={pathname.startsWith(items[3].href)}
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