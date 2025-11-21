"use client";

import Link from "next/link"; // Next.js routing

// Utility to slugify titles
function slugify(str) {
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/@/g, "at")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export default function ResultsGrid({ results }) {
  if (!results || results.length === 0) {
    return <p className="text-gray-600 dark:text-gray-400">No recommendation found.</p>;
  }

  const item = results[0]; // only one result
  const isAnime = item.coverImage !== undefined;

  // Image source
  const imageSrc = isAnime
    ? item.coverImage.large
    : `https://image.tmdb.org/t/p/w500${item.poster_path}`;

  // Title
  const title = isAnime
    ? item.title.english || item.title.romaji
    : item.title || item.name;

  // Metrics
  const rating = isAnime ? item.averageScore : item.vote_average;
  const popularity = item.popularity;
  const releaseYear = isAnime
    ? item.startDate?.year
    : item.release_date?.split("-")[0];

  // URL for detail page
  const slug = slugify(title);
  const url = isAnime
    ? `/anime/${item.id}-${slug}`
    : `/movie/${item.id}-${slug}`;

  return (
    <div className="flex justify-center p-4">
      <Link
        href={url}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden max-w-md w-full transition transform hover:scale-105 hover:shadow-2xl"
      >
        <img
          src={imageSrc}
          alt={title}
          className="w-full h-80 object-cover"
        />
        <div className="p-4 text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {title}
          </h2>

          {/* Metrics */}
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">
            {rating && (
              <span className="flex items-center gap-1">
                ⭐ {rating}/10
              </span>
            )}
            {popularity && (
              <span className="flex items-center gap-1">
                👥 {popularity}
              </span>
            )}
            {releaseYear && (
              <span className="flex items-center gap-1">
                📅 {releaseYear}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
