"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaGamepad, FaFilm, FaFan, FaUser } from "react-icons/fa";

const NAV_SECTIONS = [
  {
    label: "DISCOVER",
    items: [
      { href: "/", label: "Home", icon: FaHome },
      { href: "/movie", label: "Movies", icon: FaFilm },
      { href: "/game", label: "Games", icon: FaGamepad },
      { href: "/anime", label: "Anime", icon: FaFan },
      { href: "/character", label: "Characters", icon: FaUser },
    ],
  },
];

export default function LeftSidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const isActive = (path) => pathname === path;

  const classHelpers = useMemo(() => ({
    itemClass: (item) =>
      isActive(item.href)
        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600"
        : item.highlight
        ? "text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900",
    drawerItemClass: (item) =>
      isActive(item.href)
        ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 font-bold"
        : item.highlight
        ? "text-purple-600 dark:text-purple-400 font-semibold hover:bg-purple-50 dark:hover:bg-purple-900/20"
        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/50",
  }), [isActive]);

  return (
    <>
      {/* 1. Desktop Rail (compact icon-only, always visible) */}
      <aside className="hidden md:flex flex-col fixed top-12 left-0 h-[calc(100vh-3rem)] w-16 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-900 z-30 overflow-y-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label}>
            {/* Thin divider between sections (skip before first) */}
            {si > 0 && (
              <div className="mx-3 my-1 border-t border-gray-100 dark:border-gray-800" />
            )}
            <ul className="flex flex-col items-center space-y-0.5 pt-1 pb-1">
              {section.items.map((item) => (
                <li key={item.href} className="w-full px-1.5">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${classHelpers.itemClass(item)}`}
                  >
                    <item.icon size={18} />
                    <span className="text-[9px] mt-1 font-bold leading-tight text-center">
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      {/* 2. Global Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* 3. Expanded Drawer (mobile + hamburger on desktop) */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-950 z-50 transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center px-5 border-b border-gray-100 dark:border-gray-900 shrink-0">
          <span className="font-black text-gray-900 dark:text-white text-base uppercase tracking-tight">
            Spin<span className="text-blue-600">Papa</span>
          </span>
        </div>

        {/* Drawer nav with section groups */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-1 text-[10px] font-extrabold uppercase tracking-widest text-gray-400 dark:text-gray-600">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${classHelpers.drawerItemClass(item)}`}
                    >
                      <item.icon size={17} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
