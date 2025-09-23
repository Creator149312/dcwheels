"use client";

import { MdTrendingUp } from "react-icons/md";

const trendingPages = [
  { slug: "clash-royale-random-card-generator", title: "Clash Royale Random Card Generator" },
  { slug: "love-challenges-picker", title: "Love Challenges Picker Wheel for Couples" },
  { slug: "song-association-wheel", title: "Song Association Wheel" },
  { slug: "dti-challenges-wheel", title: "Dress to Impress Challenges Picker" },
  { slug: "elden-ring-nightreign-characters", title: "Elden Ring: Nightreign Characters Picker" },
  { slug: "drawing-ideas-picker", title: "What to Draw? - Drawing Ideas Picker Wheel" },
  { slug: "valorant-map-rotation", title: "Valorant Map Rotation Wheel" },
  { slug: "deltarune-random-character", title: "Deltarune Random Character Picker Wheel" },
  { slug: "european-clubs-picker", title: "European Football Club Teams Picker Wheel" },
];

export default function RightSidebar() {
  return (
    <aside className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 h-screen sticky top-0 overflow-y-auto p-4">
      <h2 className="flex items-center text-lg font-semibold mb-4 dark:text-gray-100">
        <span className="pr-4">Trending Pages</span>
        <MdTrendingUp size={24} />
      </h2>

      <div className="flex flex-col gap-3">
        {trendingPages.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No trending pages found.
          </p>
        ) : (
          trendingPages.map(({ slug, title }) => (
            <a
              key={slug}
              href={`/wheels/${slug}`}
              className="group p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <p className="text-sm font-medium dark:text-gray-100 group-hover:underline">
                {title}
              </p>
            </a>
          ))
        )}
      </div>
    </aside>
  );
}
