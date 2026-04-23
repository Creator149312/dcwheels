"use client";

import { Star, ArrowRight } from "lucide-react";

/**
 * Utility to get external URL for anime/movie
 */
function getExternalUrl(item, isAnime) {
  if (isAnime) return `https://anilist.co/anime/${item.id}`;
  return `https://www.themoviedb.org/movie/${item.id}`;
}

export default function ResultsGrid({ results, loading }) {
  // 1. Loading State (Skeleton)
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i}>
            <div className="aspect-[2/3] w-full bg-gray-200 dark:bg-gray-800 rounded-2xl" />
            <div className="mt-2 h-3 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // 2. Empty State
  if (!results || results.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Matches Found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full animate-in fade-in zoom-in-95 duration-500">
      {results.map((item) => {
        const isAnime = item.coverImage !== undefined;
        const title = isAnime
          ? (item.title.english || item.title.romaji)
          : (item.title || item.name);
        const imageSrc = isAnime
          ? (item.coverImage.extraLarge || item.coverImage.large)
          : `https://image.tmdb.org/t/p/w780${item.poster_path}`;
        const rating = isAnime
          ? (item.averageScore / 10).toFixed(1)
          : item.vote_average?.toFixed(1);
        const releaseYear = isAnime
          ? item.startDate?.year
          : item.release_date?.split("-")[0];
        const url = getExternalUrl(item, isAnime);

        return (
          <a
            key={item.id}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-gray-900 rounded-2xl overflow-hidden shadow-lg transition-all active:scale-[0.97] hover:shadow-xl"
          >
            <div className="relative aspect-[2/3] overflow-hidden">
              <img
                src={imageSrc}
                alt={title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent opacity-90" />
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-3">
              <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1">
                {title}
              </h3>
              <div className="flex items-center gap-2 text-[10px]">
                {rating && rating !== "0.0" && (
                  <span className="flex items-center gap-0.5 text-yellow-400 font-bold">
                    <Star size={10} fill="currentColor" /> {rating}
                  </span>
                )}
                {releaseYear && (
                  <span className="text-white/60 font-bold">{releaseYear}</span>
                )}
                <span className="px-1 py-0.5 rounded bg-white/10 text-[9px] font-black text-white/70 uppercase">
                  {isAnime ? "Anime" : "Movie"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-blue-400 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                View Details <ArrowRight size={10} />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// "use client";

// import Link from "next/link"; // Next.js routing

// // Utility to slugify titles
// function slugify(str) {
//   return str
//     .normalize("NFKD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .replace(/&/g, "and")
//     .replace(/@/g, "at")
//     .replace(/[^a-z0-9]+/g, "-")
//     .replace(/^-+|-+$/g, "")
//     .replace(/--+/g, "-");
// }

// export default function ResultsGrid({ results }) {
//   if (!results || results.length === 0) {
//     return <p className="text-gray-600 dark:text-gray-400">No recommendation found.</p>;
//   }

//   const item = results[0]; // only one result
//   const isAnime = item.coverImage !== undefined;

//   // Image source
//   const imageSrc = isAnime
//     ? item.coverImage.large
//     : `https://image.tmdb.org/t/p/w500${item.poster_path}`;

//   // Title
//   const title = isAnime
//     ? item.title.english || item.title.romaji
//     : item.title || item.name;

//   // Metrics
//   const rating = isAnime ? item.averageScore : item.vote_average;
//   const popularity = item.popularity;
//   const releaseYear = isAnime
//     ? item.startDate?.year
//     : item.release_date?.split("-")[0];

//   // URL for detail page
//   const slug = slugify(title);
//   const url = isAnime
//     ? `/anime/${item.id}-${slug}`
//     : `/movie/${item.id}-${slug}`;

//   return (
//     <div className="flex justify-center p-4">
//       <Link
//         href={url}
//         className="bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden max-w-md w-full transition transform hover:scale-105 hover:shadow-2xl"
//       >
//         <img
//           src={imageSrc}
//           alt={title}
//           className="w-full h-80 object-cover"
//         />
//         <div className="p-4 text-center">
//           <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">
//             {title}
//           </h2>

//           {/* Metrics */}
//           <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">
//             {rating && (
//               <span className="flex items-center gap-1">
//                 ⭐ {rating}/10
//               </span>
//             )}
//             {popularity && (
//               <span className="flex items-center gap-1">
//                 👥 {popularity}
//               </span>
//             )}
//             {releaseYear && (
//               <span className="flex items-center gap-1">
//                 📅 {releaseYear}
//               </span>
//             )}
//           </div>
//         </div>
//       </Link>
//     </div>
//   );
// }
