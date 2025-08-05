import Link from "next/link";
import { AniList, MediaType } from "@spkrbox/anilist";

// Slugify helper
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Search helper (server-side)
async function searchAnime(query) {
  if (!query) return [];

  const client = new AniList();
  const response = await client.media.search({
    search: query,
    type: MediaType.ANIME,
    perPage: 10,
    sort: ["POPULARITY_DESC"],
  });

  return response.media || [];
}

// Server Component
export default async function AnimeSearchPage({ searchParams }) {
  const query = searchParams.q || "";
  const results = await searchAnime(query);

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-black dark:text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
        Search Anime
      </h1>

      <form className="mb-6">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search anime..."
          className="w-full max-w-md px-4 py-2 rounded border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Search
        </button>
      </form>

      {query && (
        <>
          <h2 className="text-xl font-semibold mb-4">
            Results for: <span className="text-blue-500">{query}</span>
          </h2>

          {results.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No results found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {results.map((anime) => {
                const titleBase = anime.title.romaji || anime.title.english || "anime";
                const slug = slugify(titleBase);
                const url = `/anime/${anime.id}-${slug}`;

                return (
                  <Link key={anime.id} href={url}>
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:scale-105 transition-transform duration-200">
                      <img
                        src={anime.coverImage?.large || "/placeholder.jpg"}
                        alt={anime.title.english || anime.title.romaji}
                        className="w-full h-64 object-cover"
                      />
                      <div className="p-2">
                        <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                          {anime.title.english || anime.title.romaji}
                        </h3>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
