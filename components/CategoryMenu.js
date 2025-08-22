"use client";

import { useState } from "react";
import {
  FaMusic,
  FaFilm,
  FaGamepad,
  FaBook,
  FaUtensils,
  FaTh,
} from "react-icons/fa";
import { GiSoccerBall } from "react-icons/gi";
import { SiAnilist } from "react-icons/si";
import { BiWorld } from "react-icons/bi";
import { FaFan } from "react-icons/fa";        // Japanese folding fan


const categories = [
{ name: "Anime", slug: "anime", icon: <FaFan size={20} /> },
  { name: "Movies", slug: "movie", icon: <FaFilm size={20} /> },
  { name: "Games", slug: "game", icon: <FaGamepad size={20} /> },
  // { name: "Sports", slug: "sport", icon: <GiSoccerBall size={20} /> },
  // { name: "Education", slug: "education", icon: <FaBook size={20} /> },
  // { name: "Food", slug: "food", icon: <FaUtensils size={20} /> },
  // { name: "Travel", slug: "travel", icon: <BiWorld size={20} /> },
  // { name: "Music", slug: "music", icon: <FaMusic size={20} /> },
];

export default function CategoryMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      {/* Toggle Button - 9 dots */}
      <button
        onClick={() => setOpen(!open)}
        className="p-2 m-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
      >
        <FaTh size={22} className="text-gray-800 dark:text-gray-200" />
      </button>
      {/* Dropdown Panel */}
      {open && (
        <>
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1f1f1f] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 p-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              Categories
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {categories.map(({ name, slug, icon }) => (
                <a
                  key={name}
                  href={`/${slug}`}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <span className="text-xl text-gray-700 dark:text-gray-200">
                    {icon}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 mt-1 text-center">
                    {name}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Overlay to close when clicking outside */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}
