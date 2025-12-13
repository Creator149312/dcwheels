import Link from "next/link";
import apiConfig from "@utils/ApiUrlConfig";
import {
  fetchAnime,
  fetchCharacters,
  fetchGames,
  fetchMovies,
  renderAnimeCard,
  renderCharacterCard,
  renderGameCard,
  renderMovieCard,
} from "./TopicPagesHelperFunctions";

const BASE_URL = apiConfig.baseUrl;

export async function generateMetadata({ params }) {
  const { type } = params;

  const typeLabels = {
    anime: "Anime",
    movie: "Movies",
    game: "Games",
    character: "Characters",
    custom: "Custom Wheels",
  };

  const typeDescriptions = {
    anime:
      "Discover trending anime titles, vote on your favorites, and explore community-generated wheels.",
    movie:
      "Explore popular movies, share your reactions, and spin up themed wheels for your next watch party.",
    game: "Browse top-rated games, vote on recommendations, and create wheels for your next gaming session.",
    character:
      "Explore iconic characters, celebrate fan favorites, and create wheels to spark fun character matchups.",
    custom:
      "Create and explore custom wheels made by the community for any topic imaginable.",
  };

  const label = typeLabels[type] || "Content";
  const description =
    typeDescriptions[type] ||
    "Explore curated content and community-generated wheels.";

  return {
    title: `${label}`,
    description,
  };
}

// ---------- Main Page ----------
export default async function TopicListPage({ params, searchParams }) {
  const type = params.type; // "anime", "movie", "game", "character"
  const search = searchParams?.search || "";
  const genre = searchParams?.genre || "";
  const year = searchParams?.year || "";
  const page = Math.max(1, parseInt(searchParams?.page || "1"));

  let items = [];
  let genresList = [];

  if (type === "anime") {
    items = await fetchAnime({ search, genre, year, page });
    genresList = [
      "Action",
      "Adventure",
      "Comedy",
      "Drama",
      "Fantasy",
      "Romance",
      "Sci-Fi",
    ];
  }
  if (type === "movie") {
    items = await fetchMovies({ search, genres: genre, year, page });
    genresList = ["28", "12", "16", "35", "80", "18", "10751"]; // Example TMDB IDs
  }
  if (type === "game") {
    items = await fetchGames({ search, genres: genre, year, page });
    genresList = [
      "action",
      "adventure",
      "rpg",
      "strategy",
      "shooter",
      "puzzle",
      "sports",
    ];
  }
  if (type === "character") {
    items = await fetchCharacters({ search, page });

    // You can define categories for characters instead of genres
    // For example: roles, traits, or popularity buckets
    genresList = ["Main", "Supporting", "Male", "Female", "Villain", "Hero"];
  }

  const typeLabel =
    type === "anime"
      ? "🎌 Discover Anime"
      : type === "movie"
      ? "🎬 Discover Movies"
      : type === "game"
      ? "🎮 Discover Games"
      : type === "character"
      ? "🧑‍🤝‍🧑 Discover Iconic Characters"
      : "";

  return (
    <div className="p-6 bg-white dark:bg-gray-950 text-black dark:text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6">{typeLabel}</h1>

      {/* Filters */}
      <form className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4" method="get">
        <input
          name="search"
          type="text"
          placeholder={`Search ${type}s...`}
          defaultValue={search}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        />

        <select
          name="genre"
          defaultValue={genre}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All Genres</option>
          {genresList.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          name="year"
          defaultValue={year}
          className="border px-4 py-2 rounded dark:bg-gray-800 dark:border-gray-700"
        >
          <option value="">All Years</option>
          {Array.from({ length: 2025 - 1980 + 1 }, (_, i) => 1980 + i)
            .reverse()
            .map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
        </select>

        <button
          type="submit"
          className="sm:col-span-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Apply Filters
        </button>
      </form>

      {/* Content Grid */}
      {items.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((item) =>
              type === "anime"
                ? renderAnimeCard(item)
                : type === "movie"
                ? renderMovieCard(item)
                : type === "game"
                ? renderGameCard(item)
                : type === "character"
                ? renderCharacterCard(item)
                : null
            )}
          </div>

          {/* Pagination */}
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
            {items.length === 20 && (
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
        <p className="text-gray-600 dark:text-gray-400">
          No {type}s found with current filters.
        </p>
      )}
    </div>
  );
}
