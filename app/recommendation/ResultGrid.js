"use client";

import Link from "next/link";
import { Star, ArrowRight, Calendar, Users } from "lucide-react";

/**
 * Utility to create SEO-friendly URLs
 */
function slugify(str) {
  if (!str) return "item";
  return str
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export default function ResultsGrid({ results, loading }) {
  // 1. Loading State (Skeleton)
  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto animate-pulse">
        <div className="aspect-[16/10] w-full bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="mt-3 h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded" />
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

  const item = results[0];
  const isAnime = item.coverImage !== undefined;

  // Data Normalization
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

  const slug = slugify(title);
  const url = isAnime ? `/anime/${item.id}-${slug}` : `/movie/${item.id}-${slug}`;

  return (
    <div className="w-full flex justify-center animate-in fade-in zoom-in-95 duration-500">
      <Link 
        href={url} 
        className="group relative w-full max-w-sm bg-gray-900 rounded-2xl overflow-hidden shadow-xl transition-all active:scale-[0.98]"
      >
        {/* Compact Aspect Ratio for Mobile (16:10 saves vertical space) */}
        <div className="relative aspect-[16/10] sm:aspect-square overflow-hidden">
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* Heavy bottom gradient to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent opacity-90" />
          
          {/* Top Badge */}
          <div className="absolute top-3 left-3">
            <span className="bg-blue-600 text-[9px] font-black text-white px-2 py-0.5 rounded shadow-lg uppercase tracking-tighter">
              Match Found
            </span>
          </div>
        </div>

        {/* Content Overlay - Positioned over the bottom of the image to save height */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pt-10">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-black text-white leading-tight truncate mb-1">
                {title}
              </h2>
              
              <div className="flex items-center gap-3">
                {rating && rating !== "0.0" && (
                  <div className="flex items-center gap-1 text-yellow-400 font-bold text-xs">
                    <Star size={12} fill="currentColor" /> {rating}
                  </div>
                )}
                {releaseYear && (
                  <div className="flex items-center gap-1 text-white/70 font-bold text-xs">
                    <Calendar size={12} /> {releaseYear}
                  </div>
                )}
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-black text-white/80 uppercase">
                  {isAnime ? "Anime" : "Movie"}
                </span>
              </div>
            </div>

            {/* Action Icon */}
            <div className="flex-shrink-0 h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:translate-x-1 transition-transform">
              <ArrowRight size={20} />
            </div>
          </div>
        </div>
      </Link>
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
