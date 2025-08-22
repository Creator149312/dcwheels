import Link from "next/link";
import { AniList, MediaType } from "@spkrbox/anilist";
import { slugify } from "@utils/HelperFunctions";
import apiConfig from "@utils/ApiUrlConfig";

const BASE_URL = apiConfig.baseUrl;

export async function generateMetadata({ params }) {
  const { type } = params;

  const typeLabels = {
    anime: "Anime",
    movie: "Movies",
    game: "Games",
    custom: "Custom Wheels",
  };

  const typeDescriptions = {
    anime: "Discover trending anime titles, vote on your favorites, and explore community-generated wheels.",
    movie: "Explore popular movies, share your reactions, and spin up themed wheels for your next watch party.",
    game: "Browse top-rated games, vote on recommendations, and create wheels for your next gaming session.",
    custom: "Create and explore custom wheels made by the community for any topic imaginable.",
  };

  const label = typeLabels[type] || "Content";
  const description = typeDescriptions[type] || "Explore curated content and community-generated wheels.";

  return {
    title: `${label}`,
    description,
  };
}

// ---------- Anime Fetch ----------
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
  if (genre) media = media.filter((anime) => anime.genres?.includes(genre));
  if (year) media = media.filter((anime) => anime.startDate?.year == parseInt(year));
  return media;
}

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

// ---------- Movie Fetch ----------
async function fetchMovies({ search, genres, year, page = 1 }) {
  const API_KEY = process.env.TMDB_API_KEY;
  if (search) {
    const url = new URL(`https://api.themoviedb.org/3/search/movie`);
    url.searchParams.set("api_key", API_KEY);
    url.searchParams.set("language", "en-US");
    url.searchParams.set("query", search);
    url.searchParams.set("page", page);
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();
    return data.results || [];
  }
  const url = new URL(`https://api.themoviedb.org/3/discover/movie`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("page", page);
  if (genres) url.searchParams.set("with_genres", genres);
  if (year) url.searchParams.set("primary_release_year", year);
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  return data.results || [];
}

function renderMovieCard(movie) {
  const name = movie.title;
  const slug = slugify(name);
  const url = `/movie/${movie.id}-${slug}`;
  return (
    <Link key={movie.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img
          src={
            movie.poster_path
              ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
              : "/placeholder.jpg"
          }
          alt={name}
          className="w-full h-64 object-cover"
        />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate">{name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {movie.release_date?.slice(0, 4) || "—"} · {movie.genres?.[0]?.name || ""}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ---------- Game Fetch ----------
async function fetchGames({ search, genres, year, page = 1 }) {
  const API_KEY = process.env.RAWG_API_KEY;
  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", API_KEY);
  url.searchParams.set("page", page);
  url.searchParams.set("page_size", 20);
  url.searchParams.set("ordering", "-added");
  if (search) url.searchParams.set("search", search);
  if (genres) url.searchParams.set("genres", genres);
  if (year) url.searchParams.set("dates", `${year}-01-01,${year}-12-31`);
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  return data.results || [];
}

function renderGameCard(game) {
  const slug = game.slug;
  const url = `/game/${game.id}-${slug}`;
  return (
    <Link key={game.id} href={url}>
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
        <img
          src={game.background_image || "/placeholder.jpg"}
          alt={game.name}
          className="w-full h-64 object-cover"
        />
        <div className="p-2">
          <h3 className="text-sm font-semibold truncate">{game.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {game.released?.slice(0, 4) || "—"} · {game.genres?.[0]?.name || ""}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ---------- Main Page ----------
export default async function TopicListPage({ params, searchParams }) {
  const type = params.type; // "anime", "movie", "game"
  const search = searchParams?.search || "";
  const genre = searchParams?.genre || "";
  const year = searchParams?.year || "";
  const page = Math.max(1, parseInt(searchParams?.page || "1"));

  let items = [];
  let genresList = [];

  if (type === "anime") {
    items = await fetchAnime({ search, genre, year, page });
    genresList = ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance", "Sci-Fi"];
  }
  if (type === "movie") {
    items = await fetchMovies({ search, genres: genre, year, page });
    genresList = ["28", "12", "16", "35", "80", "18", "10751"]; // Example TMDB IDs
  }
  if (type === "game") {
    items = await fetchGames({ search, genres: genre, year, page });
    genresList = ["action", "adventure", "rpg", "strategy", "shooter", "puzzle", "sports"];
  }

  const typeLabel =
    type === "anime" ? "🎌 Discover Anime" :
    type === "movie" ? "🎬 Discover Movies" :
    "🎮 Discover Games";

return (
  <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
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
          <option key={g} value={g}>{g}</option>
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
            <option key={y} value={y}>{y}</option>
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
              : renderGameCard(item)
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