import Link from "next/link";
import { Suspense } from "react";
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
      "Discover trending anime titles, vote on your favorites, and explore community-generated wheels and lists.",
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
  const page = Math.max(1, parseInt(searchParams?.page || "1"));

  const typeLabel =
    type === "anime" ? "🎌 Discover Anime"
    : type === "movie" ? "🎬 Discover Movies"
    : type === "game" ? "🎮 Discover Games"
    : type === "character" ? "🧑‍🤝‍🧑 Discover Iconic Characters"
    : "";

  return (
    <div className="p-6 bg-white dark:bg-gray-950 text-black dark:text-white min-h-screen">
      <div className="mb-6">
        {/* Container switches layout based on screen size */}
        <h1 className="text-3xl font-bold">{typeLabel}</h1>
      </div>

      <Suspense fallback={
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-xl aspect-[3/4] w-full" />
          ))}
        </div>
      }>
        <SuspendedContentGrid type={type} page={page} />
      </Suspense>
    </div>
  );
}

async function SuspendedContentGrid({ type, page }) {
  let items = [];

  if (type === "anime") {
    items = await fetchAnime({ page });
  } else if (type === "movie") {
    items = await fetchMovies({ page });
  } else if (type === "game") {
    items = await fetchGames({ page });
  } else if (type === "character") {
    items = await fetchCharacters({ page });
  }

  if (items.length === 0) {
    return (
      <p className="text-gray-600 dark:text-gray-400">
        No {type}s found with current filters.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {items.map((item) =>
          type === "anime" ? renderAnimeCard(item)
          : type === "movie" ? renderMovieCard(item)
          : type === "game" ? renderGameCard(item)
          : type === "character" ? renderCharacterCard(item)
          : null
        )}
      </div>

      {/* ✅ Pagination */}
      <div className="mt-6 flex justify-center gap-4">
        {page > 1 && (
          <form method="get">
            <input type="hidden" name="page" value={page - 1} />
            <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition">
              ← Prev
            </button>
          </form>
        )}

        {items.length === 20 && (
          <form method="get">
            <input type="hidden" name="page" value={page + 1} />
            <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition">
              Next →
            </button>
          </form>
        )}
      </div>
    </>
  );
}

