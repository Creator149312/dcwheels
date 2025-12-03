import {
  fetchAnime,
  renderAnimeCard,
} from "@app/(content)/[type]/TopicPagesHelperFunctions";

export default async function AnimeSection({ searchtitle }) {
  const anime = await fetchAnime({ search: searchtitle, page: 1, perPage: 5 });

  if (!anime || anime.length === 0) {
    return null; // or <p className="mt-4 text-gray-500">No anime found.</p>
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">Anime</h2>
      <div className="w-full max-w-full overflow-x-scroll overflow-y-hidden">
        <div className="flex flex-nowrap space-x-4 snap-x snap-mandatory">
          {anime.map((item) => (
            <div
              key={item.mal_id}
              className="flex-shrink-0 min-w-[8rem] sm:min-w-[10rem] md:min-w-[12rem] lg:min-w-[14rem] snap-start"
            >
              {renderAnimeCard(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
