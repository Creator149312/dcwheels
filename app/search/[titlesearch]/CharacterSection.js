import { fetchCharacters } from "@app/(content)/[type]/TopicPagesHelperFunctions";
import { slugify } from "@utils/HelperFunctions";
import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default async function CharacterSection({ searchtitle }) {
  const characters = await fetchCharacters({ search: searchtitle, page: 1, perPage: 20 });

  if (!characters || characters.length === 0) {
    return <EmptyState query={searchtitle} label="characters" />;
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4 font-medium">
        Found {characters.length} character result{characters.length !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {characters.map((item) => {
          const name =
            item.name?.full ||
            item.name?.native ||
            item.name?.alternative?.[0] ||
            "Unnamed";
          const url = `/character/${item.id}-${slugify(name)}`;
          return (
            <Link key={item.id} href={url} className="group">
              <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-[3/4] mb-2 group-hover:scale-105 transition-transform duration-200 shadow-sm relative">
                {item.image?.large && (
                  <Image
                    src={item.image.large}
                    alt={name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    className="object-cover"
                  />
                )}
              </div>
              <p className="text-sm font-semibold truncate text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {name}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {item.gender || "—"}{item.age ? ` · ${item.age}` : ""}
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
