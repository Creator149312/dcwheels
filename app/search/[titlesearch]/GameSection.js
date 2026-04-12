import { fetchGames } from "@app/(content)/[type]/TopicPagesHelperFunctions";
import { Search } from "lucide-react";

export default async function GameSection({ searchtitle }) {
  const games = await fetchGames({ search: searchtitle, page: 1, page_size: 20 });

  if (!games || games.length === 0) {
    return <EmptyState query={searchtitle} label="games" />;
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4 font-medium">
        Found {games.length} game result{games.length !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {games.map((item) => {
          const url = `/game/${item.id}-${item.slug}`;
          return (
            <a key={item.id} href={url} className="group">
              <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[3/4] mb-2 group-hover:scale-105 transition-transform duration-200 shadow-sm">
                <img
                  src={item.background_image}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm font-semibold truncate text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {item.name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {item.released?.slice(0, 4) || "—"} · {item.genres?.[0]?.name || ""}
              </p>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ query, label }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
        <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 rounded-3xl shadow-xl">
          <Search className="w-10 h-10 text-blue-500" />
        </div>
      </div>
      <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">No {label} found</h2>
      <p className="text-sm text-gray-500 max-w-xs">
        No {label} matched{" "}
        <span className="font-semibold text-gray-900 dark:text-gray-200">{query}</span>.
      </p>
    </div>
  );
}
