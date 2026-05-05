"use client";

import { useRouter, useSearchParams } from "next/navigation";

// Sort options per content type.
const SORT_OPTIONS = {
  anime:     [{ v: "",         l: "Trending"   },
              { v: "popular",  l: "Popular"    },
              { v: "new",      l: "New"        },
              { v: "top",      l: "Top Rated"  }],
  movie:     [{ v: "",         l: "Trending"   },
              { v: "new",      l: "New Releases"},
              { v: "top",      l: "Top Rated"  }],
  game:      [{ v: "",         l: "Trending"   },
              { v: "new",      l: "Newest"     },
              { v: "top",      l: "Top Rated"  }],
  character: [{ v: "",         l: "Popular"    },
              { v: "new",      l: "Newest"     }],
};

// Human-readable labels for RAWG genre slugs.
const GENRE_LABELS = { "role-playing-games-rpg": "RPG" };
const label = (g) => GENRE_LABELS[g] || (g.charAt(0).toUpperCase() + g.slice(1));

export default function FiltersBarWrapper({ genresList = [], type }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort  = searchParams.get("sort")  || "";
  const currentGenre = searchParams.get("genre") || "";

  // Merge any key-value updates into the current URL, always reset to page 1.
  const pushParams = (updates) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    p.set("page", "1");
    router.push(`?${p.toString()}`);
  };

  const sortOptions = SORT_OPTIONS[type] || [];

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* ── Sort tabs ───────────────────────────────────────────────────── */}
      {sortOptions.map(({ v, l: lbl }) => (
        <button
          key={v}
          onClick={() => pushParams({ sort: v })}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            currentSort === v
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400"
          }`}
        >
          {lbl}
        </button>
      ))}

      {/* ── Genre dropdown ──────────────────────────────────────────────── */}
      {genresList.length > 0 && (
        <select
          value={currentGenre}
          onChange={(e) => pushParams({ genre: e.target.value })}
          className="ml-auto shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 cursor-pointer transition-colors hover:border-blue-400 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Genres</option>
          {genresList.map((g) => (
            <option key={g} value={g}>{label(g)}</option>
          ))}
        </select>
      )}

    </div>
  );
}
