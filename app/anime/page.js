import React from "react";
import Link from "next/link";
import { AniList, MediaType } from "@spkrbox/anilist";

// Helper: Slugify anime titles for URLs
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Server-side anime fetcher with filters and pagination
async function fetchAnime({ search, genre, year, page = 1, perPage = 20, sort = "POPULARITY_DESC" }) {
  const client = new AniList();

  const response = await client.media.search({
    type: MediaType.ANIME,
    search: search || undefined,
    sort: [sort],
    page,
    perPage,
  });

  let media = response.media || [];

  if (genre) {
    media = media.filter((anime) => anime.genres && anime.genres.includes(genre));
  }

  if (year) {
    media = media.filter((anime) => anime.startDate?.year == parseInt(year));
  }

  return media;
}

// Render reusable anime card
function renderAnimeCard(anime) {
  const title = anime.title.english || anime.title.romaji || "Untitled";
  const slug = slugify(title);
  const url = `/anime/${anime.id}-${slug}`;

  return (
    <Link key={anime.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img
          src={anime.coverImage?.large || "/placeholder.jpg"}
          alt={title}
          className="w-full h-64 object-cover"
        />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {anime.startDate?.year || "—"} · {anime.format}
          </p>
        </div>
      </div>
    </Link>
  );
}

// Main page component
// ...all imports and utility functions remain the same

export default async function AnimeListPage({ searchParams }) {
  const search = searchParams?.search || "";
  const genre = searchParams?.genre || "";
  const year = searchParams?.year || "";
  const page = Math.max(1, parseInt(searchParams?.page || "1"));
  const perPage = 20;

  const animeList = await fetchAnime({ search, genre, year, page, perPage });

  const years = Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 1980 + i).reverse();
  const genres = ["Action", "Drama", "Comedy", "Fantasy", "Romance", "Horror", "Adventure", "Sci-Fi"];

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Discover Anime</h1>

      {/* Filters Form */}
      <form className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4" method="get">
        <input
          name="search"
          type="text"
          placeholder="Search anime..."
          defaultValue={search}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        />

        <select
          name="genre"
          defaultValue={genre}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All Genres</option>
          {genres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <select
          name="year"
          defaultValue={year}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y.toString()}>{y}</option>
          ))}
        </select>

        <button
          type="submit"
          className="sm:col-span-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Apply Filters
        </button>
      </form>

      {/* Anime Grid */}
      {animeList.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {animeList.map((anime) => renderAnimeCard(anime))}
          </div>

          {/* Pagination Buttons */}
          <div className="mt-6 flex justify-center gap-4">
            {page > 1 && (
              <form method="get">
                <input type="hidden" name="search" value={search} />
                <input type="hidden" name="genre" value={genre} />
                <input type="hidden" name="year" value={year} />
                <input type="hidden" name="page" value={page - 1} />
                <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition">
                  ← Prev
                </button>
              </form>
            )}

            {animeList.length === perPage && (
              <form method="get">
                <input type="hidden" name="search" value={search} />
                <input type="hidden" name="genre" value={genre} />
                <input type="hidden" name="year" value={year} />
                <input type="hidden" name="page" value={page + 1} />
                <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition">
                  Next →
                </button>
              </form>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">No anime found with current filters.</p>
      )}
    </div>
  );
}
