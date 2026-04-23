"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaGamepad, FaFilm, FaFan, FaUser } from "react-icons/fa";

export default function LeftSidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  const NAV_ITEMS = [
    { href: "/", label: "Home", icon: FaHome },
    { href: "/game", label: "Games", icon: FaGamepad },
    { href: "/anime", label: "Anime", icon: FaFan },
    { href: "/movie", label: "Movies", icon: FaFilm },
    { href: "/character", label: "Characters", icon: FaUser },
  ];

  const isActive = (path) => pathname === path;

  return (
    <>
      {/* 1. Desktop Rail (Always visible) */}
      <aside className="hidden md:block fixed top-12 left-0 h-[calc(100vh-3rem)] w-16 bg-white dark:bg-gray-950 border-r border-gray-100 dark:border-gray-900 z-30">
        <ul className="flex flex-col items-center space-y-0.5 pt-3">
          {NAV_ITEMS.map((item) => (
            <li key={item.href} className="w-full px-1.5">
              <a
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${isActive(item.href) ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900"}`}
              >
                <item.icon size={18} />
                <span className="text-[10px] mt-1 font-bold">
                  {item.label}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </aside>

      {/* 2. Global Backdrop (FIXED) */}
      {/* This invisible layer sits behind the side drawer but above the content */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 z-40 ${
          isOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={onClose} // This handles clicking outside
      />

      {/* 3. Expanded Sidebar Drawer (Mobile & Desktop) */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-950 z-50 transition-transform duration-300 ease-in-out shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-12 flex items-center px-5 border-b border-gray-100 dark:border-gray-900 md:hidden">
          <span className="font-black text-blue-600 text-sm">MENU</span>
        </div>

        <nav className="px-2.5 pt-3">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                    isActive(item.href)
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 font-bold"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-sm">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import {
//   FaHome,
//   FaGamepad,
//   FaFilm,
//   FaFan,   // ✅ Anime icon
//   FaUser,  // ✅ Character icon
// } from "react-icons/fa";

// export default function LeftSidebar({ isOpen }) {
//   const pathname = usePathname();

//   const collapsedItemClass = (path) =>
//     `flex flex-col items-center justify-center h-20 w-16 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
//       pathname === path
//         ? "bg-gray-200 dark:bg-gray-700 font-semibold"
//         : "text-gray-700 dark:text-gray-200"
//     }`;

//   const expandedItemClass = (path) =>
//     `flex items-center gap-3 px-4 py-3 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
//       pathname === path
//         ? "bg-gray-200 dark:bg-gray-700 font-semibold"
//         : "text-gray-700 dark:text-gray-200"
//     }`;

//   return (
//     <>
//       {/* Collapsed Sidebar (always visible) */}
//       <aside className="hidden md:block fixed top-16 left-0 h-[calc(100vh-4rem)] w-16 bg-white dark:bg-slate-950 z-30">
//         <ul className="space-y-2 pt-4">
//           <li>
//             <a href="/" className={collapsedItemClass("/")}>
//               <FaHome size={24} />
//               <span>Home</span>
//             </a>
//           </li>
//           <li>
//             <a href="/game" className={collapsedItemClass("/game")}>
//               <FaGamepad size={24} />
//               <span>Games</span>
//             </a>
//           </li>
//           <li>
//             <a href="/anime" className={collapsedItemClass("/anime")}>
//               <FaFan size={24} />
//               <span>Anime</span>
//             </a>
//           </li>
//           <li>
//             <a href="/movie" className={collapsedItemClass("/movie")}>
//               <FaFilm size={24} />
//               <span>Movies</span>
//             </a>
//           </li>
//           <li>
//             <a href="/character" className={collapsedItemClass("/character")}>
//               <FaUser size={24} />
//               <span>Characters</span>
//             </a>
//           </li>
//         </ul>
//       </aside>

//       {/* Full Sidebar Overlay */}
//       <aside
//         className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-slate-950 z-50 transition-transform duration-300 ${
//           isOpen ? "translate-x-0" : "-translate-x-full"
//         }`}
//       >
//         <nav className="px-2 pt-4">
//           <ul className="space-y-2">
//             <li>
//               <a href="/" className={expandedItemClass("/")}>
//                 <FaHome size={18} />
//                 Home
//               </a>
//             </li>
//             <li>
//               <a href="/game" className={expandedItemClass("/game")}>
//                 <FaGamepad size={18} />
//                 Games
//               </a>
//             </li>
//             <li>
//               <a href="/anime" className={expandedItemClass("/anime")}>
//                 <FaFan size={18} />
//                 Anime
//               </a>
//             </li>
//             <li>
//               <a href="/movie" className={expandedItemClass("/movie")}>
//                 <FaFilm size={18} />
//                 Movies
//               </a>
//             </li>
//             <li>
//               <a href="/character" className={expandedItemClass("/character")}>
//                 <FaUser size={18} />
//                 Characters
//               </a>
//             </li>
//           </ul>
//         </nav>
//       </aside>
//     </>
//   );
// }
