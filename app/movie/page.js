import React from "react";
import Link from "next/link";

// Replace with your TMDB API key storage mechanism
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Utility: format release year and poster URL
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function fetchMovies({ search, genreId, year, page = 1 }) {
  // Build query params
  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    sort_by: "popularity.desc",
    page: page.toString(),
    include_adult: "false",
  });

  if (search) params.set("query", search);
  if (year) params.set("primary_release_year", year);
  if (genreId) params.set("with_genres", genreId);

  const url = search
    ? `https://api.tmdb.org/3/search/movie?${params}`
    : `https://api.tmdb.org/3/discover/movie?${params}`;

  const res = await fetch(url);
  const data = await res.json();
  return {
    movies: data.results || [],
    totalPages: data.total_pages || 0,
  };
}

function renderMovieCard(movie) {
  const title = movie.title;
  const slug = slugify(title);
  const url = `/movie/${movie.id}-${slug}`;

  const poster = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : "/placeholder.jpg";

  return (
    <Link key={movie.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img src={poster} alt={title} className="w-full h-64 object-cover" />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {movie.release_date?.slice(0,4) || "—"} · ⭐ {movie.vote_average.toFixed(1)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default async function MovieListPage({ searchParams }) {
  const page = parseInt(searchParams.page || "1");
  const search = searchParams.search || "";
  const year = searchParams.year || "";
  const genreId = searchParams.genre || "";

  const { movies, totalPages } = await fetchMovies({ search, genreId, year, page });

  const years = Array.from({ length: new Date().getFullYear() - 1970 + 1 }, (_, i) => new Date().getFullYear() - i);
  const genreMap = { "28": "Action", "35": "Comedy", "18": "Drama", /* add more */ };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Discover Movies</h1>

      {/* Filters Form */}
      <form className="mb-8 grid grid-cols-1 sm:grid-cols-4 gap-4" method="get">
        <input name="search" type="text" placeholder="Search movies..." defaultValue={search}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700" />

        <select name="genre" defaultValue={genreId}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700">
          <option value="">All Genres</option>
          {Object.entries(genreMap).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>

        <select name="year" defaultValue={year}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700">
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>

        <button type="submit" className="sm:col-span-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Apply Filters
        </button>
      </form>

      {/* Movie Grid */}
      {movies.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {movies.map(renderMovieCard)}
          </div>

          {/* Load More */}
          {page < totalPages && (
            <form method="get" className="mt-6 text-center">
              <input type="hidden" name="search" value={search} />
              <input type="hidden" name="genre" value={genreId} />
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="page" value={(page + 1).toString()} />
              <button type="submit"
                className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
                Load More
              </button>
            </form>
          )}
        </>
      ) : (
        <p className="text-gray-600 dark:text-gray-400">No movies found.</p>
      )}
    </div>
  );
}
