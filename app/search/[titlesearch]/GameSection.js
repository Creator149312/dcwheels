import { fetchGames } from "@app/(content)/[type]/TopicPagesHelperFunctions";
import { Search, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function GameSection({ searchtitle, initialData }) {
  const games = initialData || await fetchGames({ search: searchtitle, page: 1, page_size: 20 });

  if (!games || games.length === 0) {
    return <EmptyState query={searchtitle} label="games" />;
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4 font-medium px-1">
        Found {games.length} game result{games.length !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {games.map((item) => {
          const url = `/game/${item.id}-${item.slug}`;
          const rating = item.rating ? item.rating.toFixed(1) : null;

          return (
            <Link key={item.id} href={url} className="group">
              <div className="rounded-xl overflow-hidden bg-muted aspect-[3/4] mb-2 group-hover:scale-[1.03] transition-all duration-300 shadow-sm relative border border-border/10">
                {item.background_image ? (
                  <Image
                    src={item.background_image}
                    alt={item.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">No Image</div>
                )}
                {rating && rating !== "0.0" && (
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-yellow-400 text-[10px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow-lg border border-white/10">
                    <Star size={10} fill="currentColor" /> {rating}
                  </div>
                )}
              </div>
              <p className="text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors px-0.5">
                {item.name}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium px-0.5">
                {item.released?.slice(0, 4) || "—"} · Game · {item.genres?.[0]?.name || ""}
              </p>
            </Link>
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
