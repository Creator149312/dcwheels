// app/search/[titlesearch]/MoviesSection.jsx
import {
  fetchCharacters,
  renderCharacterCard,
} from "@app/(content)/[type]/TopicPagesHelperFunctions";

export default async function AnimeSection({ searchtitle }) {
  const characters = await fetchCharacters({ search: searchtitle, page: 1, perPage: 5 });

  if (!characters || characters.length === 0) {
    return null; // or <p className="mt-4 text-gray-500">No anime found.</p>
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">characters</h2>
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="flex flex-nowrap space-x-4">
          {characters.map((item) => (
            <div key={item.mal_id} className="flex-shrink-0 w-40">
              {renderCharacterCard(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
