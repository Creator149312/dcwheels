// app/search/[titlesearch]/MoviesSection.jsx
import {
  fetchMovies,
  renderMovieCard,
} from "@app/(content)/[type]/TopicPagesHelperFunctions";

export default async function AnimeSection({ searchtitle }) {
  const movies = await fetchMovies({ search: searchtitle, page: 1, perPage: 5 });

  if (!movies || movies.length === 0) {
    return null; // or <p className="mt-4 text-gray-500">No anime found.</p>
  }

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold mb-3">movies</h2>
      <div className="overflow-x-auto overflow-y-hidden">
        <div className="flex flex-nowrap space-x-4">
          {movies.map((item) => (
            <div key={item.mal_id} className="flex-shrink-0 w-40">
              {renderMovieCard(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
