import React from "react";
import { connectMongoDB } from "@/lib/mongodb";
import Movie from "@/models/movie";
import Wheel from "@/models/wheel";

// Extract TMDb ID from URL like "12345-the-movie-title"
function extractId(movieParam) {
  const id = parseInt(movieParam.split("-")[0], 10);
  return isNaN(id) ? null : id;
}

// Slugify movie titles for URLs
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Fetch movie data from TMDb API
async function fetchMovieFromTMDb(id) {
  const apiKey = process.env.TMDB_API_KEY;
  const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US`;

  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

// Generate hashtags from movie title (simple alphanumeric words)
function generateHashtags(title) {
  return title
    .split(" ")
    .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    .filter(Boolean);
}

export async function generateMetadata({ params }) {
  const id = extractId(params.movie);
  if (!id) {
    return {
      title: "Movie Not Found",
      description: "The movie you’re looking for could not be found.",
    };
  }

  const movieData = await fetchMovieFromTMDb(id);
  if (!movieData) {
    return {
      title: "Movie Not Found",
      description: `Could not locate movie with ID ${id}`,
    };
  }

  const title = movieData.title || movieData.original_title;
  const description =
    (movieData.overview && movieData.overview.slice(0, 160)) ||
    "Explore this movie's details and community-generated wheels.";

  const posterUrl = movieData.poster_path
    ? `https://image.tmdb.org/t/p/w500${movieData.poster_path}`
    : null;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: posterUrl ? [posterUrl] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: posterUrl ? [posterUrl] : [],
    },
  };
}

export default async function MovieDetailPage({ params }) {
  const id = extractId(params.movie);
  if (!id) return <div>Invalid Movie URL</div>;

  await connectMongoDB();

  // 1. Try to find in DB
  let movieDoc = await Movie.findOne({ tmdbId: id });
  let movieData;

  if (!movieDoc) {
    // Fetch from TMDb API
    movieData = await fetchMovieFromTMDb(id);
    if (!movieData) return <div>Movie not found</div>;

    const generatedSlug = `${movieData.id}-${slugify(movieData.title || movieData.original_title)}`;
    const hashtags = generateHashtags(movieData.title || movieData.original_title);

    // Save to DB
    movieDoc = await Movie.create({
      tmdbId: movieData.id,
      slug: generatedSlug,
      title: {
        original: movieData.original_title,
        localized: movieData.title,
      },
      wheels: 0,
      followers: 0,
      tags: hashtags,
    });
  } else {
    // If found in DB, fetch fresh details from TMDb API for up-to-date info
    movieData = await fetchMovieFromTMDb(movieDoc.tmdbId);
  }

  // 2. Fetch wheels related to this movie
  const taggedWheels = await Wheel.find({
    "relatedTo.type": "movie",
    "relatedTo.id": movieDoc.tmdbId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const posterUrl = movieData.poster_path
    ? `https://image.tmdb.org/t/p/w300${movieData.poster_path}`
    : "/placeholder.jpg";

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      {/* Movie Info */}
      <section className="flex flex-col sm:flex-row gap-4 mb-6">
        <img
          src={posterUrl}
          alt={movieData.title || movieData.original_title}
          className="rounded-lg w-40 h-auto"
        />
        <div>
          <h1 className="text-2xl font-bold mb-1">
            {movieData.title || movieData.original_title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
            {movieData.genres?.map((g) => g.name).join(", ")}
          </p>
          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
            {movieData.overview?.slice(0, 500)}…
          </p>
          <p className="text-sm mt-2">
            <strong>Followers:</strong> {movieDoc.followers} |{" "}
            <strong>Wheels:</strong> {movieDoc.wheels}
          </p>
        </div>
      </section>

      {/* Decision Wheels */}
      {taggedWheels.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">🎡 Decision Wheels</h2>
          <div className="space-y-4">
            {taggedWheels.map((wheel) => (
              <a
                key={wheel._id}
                href={`/uwheels/${wheel._id}`}
                className="block bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition p-4 rounded"
              >
                <h3 className="text-md font-semibold">{wheel.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {wheel.description}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
