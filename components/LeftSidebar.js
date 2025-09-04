"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaFire,
  FaGamepad,
  FaFilm,
  FaFan, // ✅ Anime icon
} from "react-icons/fa";

export default function LeftSidebar({ isOpen }) {
  const pathname = usePathname();

  const collapsedItemClass = (path) =>
    `flex flex-col items-center justify-center h-20 w-16 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
      pathname === path
        ? "bg-gray-200 dark:bg-gray-700 font-semibold"
        : "text-gray-700 dark:text-gray-200"
    }`;

  const expandedItemClass = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
      pathname === path
        ? "bg-gray-200 dark:bg-gray-700 font-semibold"
        : "text-gray-700 dark:text-gray-200"
    }`;

  return (
    <>
      {/* Collapsed Sidebar (always visible) */}
      <aside className="hidden md:block fixed top-16 left-0 h-[calc(100vh-4rem)] w-16 bg-white dark:bg-slate-950 z-30">
        <ul className="space-y-2 pt-4">
          <li>
            <a href="/" className={collapsedItemClass("/")}>
              <FaHome size={24} />
              <span>Home</span>
            </a>
          </li>
          <li>
            <a href="/game" className={collapsedItemClass("/game")}>
              <FaGamepad size={24} />
              <span>Games</span>
            </a>
          </li>
          <li>
            <a href="/anime" className={collapsedItemClass("/anime")}>
              <FaFan size={24} />
              <span>Anime</span>
            </a>
          </li>
          <li>
            <a href="/movie" className={collapsedItemClass("/movie")}>
              <FaFilm size={24} />
              <span>Movies</span>
            </a>
          </li>
        </ul>
      </aside>

      {/* Full Sidebar Overlay */}
      <aside
        className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-slate-950 z-50 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <nav className="px-2 pt-4">
          <ul className="space-y-2">
            <li>
              <a href="/" className={expandedItemClass("/")}>
                <FaHome size={18} />
                Home
              </a>
            </li>
            <li>
              <a href="/game" className={expandedItemClass("/game")}>
                <FaGamepad size={18} />
                Games
              </a>
            </li>
            <li>
              <a href="/anime" className={expandedItemClass("/anime")}>
                <FaFan size={18} />
                Anime
              </a>
            </li>
            <li>
              <a href="/movie" className={expandedItemClass("/movie")}>
                <FaFilm size={18} />
                Movies
              </a>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
