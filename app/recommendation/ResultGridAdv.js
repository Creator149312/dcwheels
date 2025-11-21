"use client";

export default function ResultsGrid({ results }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
      {results.map((item) => {
        // Detect if it's anime or movie
        const isAnime = item.coverImage !== undefined;

        // Image source
        const imageSrc = isAnime
          ? item.coverImage.large
          : `https://image.tmdb.org/t/p/w300${item.poster_path}`;

        // Title
        const title = isAnime
          ? item.title.english || item.title.romaji
          : item.title || item.name;

        return (
          <div key={item.id} className="flex flex-col items-center text-center">
            <img
              src={imageSrc}
              alt={title}
              className="w-32 h-44 object-cover rounded shadow"
            />
            <h2 className="mt-2 font-semibold text-sm">{title}</h2>
          </div>
        );
      })}
    </div>
  );
}
