"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  Film,
  Gamepad2,
  Wind,
  User,
  Disc3,
  BookMarked,
  Bookmark,
  Plus,
  MessageCircle,
  List,
  X,
} from "lucide-react";

export default function LeftSidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);

  const username = session?.user?.username || session?.user?.name;
  const savedUrl = username ? `/u/${encodeURIComponent(username.toLowerCase())}/saved` : "/login";

  // Close create menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) {
        setCreateMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close create menu on route change
  useEffect(() => {
    setCreateMenuOpen(false);
  }, [pathname]);

  const navSections = useMemo(
    () => [
      {
        label: "DISCOVER",
        items: [
          { href: "/", label: "Home", icon: Home },
          { href: "/movie", label: "Movies", icon: Film },
          { href: "/game", label: "Games", icon: Gamepad2 },
          { href: "/anime", label: "Anime", icon: Wind },
          { href: "/character", label: "Characters", icon: User },
        ],
      },
      {
        label: "FORMATS",
        items: [
          { href: "/wheels", label: "Wheels", icon: Disc3 },
          { href: "/lists", label: "Lists", icon: BookMarked },
          { href: savedUrl, label: "Saved", icon: Bookmark },
        ],
      },
    ],
    [savedUrl]
  );

  const isItemActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* 1. Desktop Adaptive Rail / Sidebar (X / Twitter style: 72px on md/lg, 240px on xl+) */}
      <aside className="hidden md:flex flex-col fixed top-[52px] left-0 h-[calc(100vh-52px)] w-[72px] xl:w-60 bg-background border-r border-border z-30 overflow-y-auto px-2 xl:px-3 py-3 justify-between transition-all duration-200">
        <div className="space-y-4">
          {navSections.map((section, si) => (
            <div key={section.label}>
              {/* Section Header: Visible only on expanded sidebar (xl+) */}
              <p className="hidden xl:block px-3 mb-1.5 text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground/70">
                {section.label}
              </p>
              
              {/* Thin divider on compact rail (md-lg) */}
              {si > 0 && <div className="xl:hidden mx-2 my-2 border-t border-border/60" />}

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={item.label}
                        className={`flex items-center justify-center xl:justify-start gap-3.5 py-2.5 px-2.5 xl:px-3.5 rounded-xl transition-all ${
                          active
                            ? "bg-primary/10 text-primary font-bold shadow-2xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground font-semibold"
                        }`}
                      >
                        <item.icon size={20} className="shrink-0" />
                        <span className="hidden xl:inline text-sm leading-none truncate">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Create Action Button & Sleek Flyout Menu */}
        <div className="pt-3 border-t border-border/40 relative" ref={createMenuRef}>
          {createMenuOpen && (
            <div className="absolute bottom-full mb-2 left-0 w-48 xl:w-full bg-card border border-border shadow-xl rounded-2xl p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <Link
                href="/post/create"
                onClick={() => setCreateMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted text-sm font-semibold text-foreground transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <MessageCircle size={16} />
                </div>
                <span>Post</span>
              </Link>
              <Link
                href="/wheels/create"
                onClick={() => setCreateMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted text-sm font-semibold text-foreground transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Disc3 size={16} />
                </div>
                <span>Wheel</span>
              </Link>
              <Link
                href="/lists/create"
                onClick={() => setCreateMenuOpen(false)}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-muted text-sm font-semibold text-foreground transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
                  <List size={16} />
                </div>
                <span>List</span>
              </Link>
            </div>
          )}

          <button
            onClick={() => setCreateMenuOpen((v) => !v)}
            title="Create Post, Wheel or List"
            aria-expanded={createMenuOpen}
            className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-full font-bold text-sm shadow-md transition-all active:scale-98 ${
              createMenuOpen
                ? "bg-primary/90 text-primary-foreground ring-2 ring-primary/30"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            <Plus
              size={18}
              strokeWidth={2.5}
              className={`shrink-0 transition-transform duration-200 ${createMenuOpen ? "rotate-45" : ""}`}
            />
            <span className="hidden xl:inline">Create</span>
          </button>
        </div>
      </aside>

      {/* 2. Desktop-Only Backdrop & Expanded Drawer (Triggered by Hamburger if needed) */}
      <div
        className={`hidden md:block fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 3. Desktop Drawer (Hamburger Triggered) */}
      <aside
        className={`hidden md:flex fixed top-0 left-0 h-full w-64 bg-background border-r border-border z-50 transition-transform duration-300 ease-in-out shadow-md flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center px-5 border-b border-border shrink-0">
          <span className="font-black text-foreground text-base uppercase tracking-tight">
            Spin<span className="text-primary">Papa</span>
          </span>
        </div>

        {/* Drawer nav with section groups */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isItemActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                          active
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
