"use client";

import Link from "next/link";
import { useEffect, useState, Fragment } from "react";
import { Hash, ChevronRight, LayoutGrid } from "lucide-react";

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tags-data")
      .then((res) => res.json())
      .then((data) => {
        setTags(data.tags || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch tags", err);
        setLoading(false);
      });
  }, []);

  // Ad interval: place an ad after every 8 tags
  const adInterval = 8;

  return (
    <div className="w-full min-h-screen bg-white dark:bg-gray-950 transition-colors pb-20">
      {/* Header Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
              <LayoutGrid size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase">
              Tag <span className="text-blue-600">Directory</span>
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Browse our full collection of spin wheels by category.
          </p>
        </div>
      </div>

      {/* Top Leaderboard Ad */}
      <div className="mb-10 w-full py-6 bg-gray-50/50 dark:bg-gray-900/30 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-black mb-3">Advertisement</span>
        <div className="w-full max-w-[728px] h-[90px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center">
          <p className="text-[11px] text-gray-400 italic">Top Leaderboard Ad (728x90)</p>
        </div>
      </div>

      {/* Main Tags Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          [...Array(12)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 dark:bg-gray-900 rounded-3xl animate-pulse" />
          ))
        ) : (
          tags.map((tag, index) => {
            const showInlineAd = (index + 1) % adInterval === 0;

            return (
              <Fragment key={tag}>
                <Link
                  href={`/tags/${encodeURIComponent(tag)}`}
                  className="group relative flex items-center p-5 bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-900 flex items-center justify-center group-hover:bg-blue-600 transition-colors duration-300 border border-gray-100 dark:border-gray-800">
                    <span className="text-lg font-black text-gray-400 dark:text-gray-600 group-hover:text-white uppercase">
                      {tag.charAt(0)}
                    </span>
                  </div>

                  <div className="ml-4 flex-1">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 transition-colors">
                      {tag}
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium mt-0.5">
                      Explore Wheels
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 dark:text-gray-700 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>

                {/* Inline Native Ad Slot */}
                {/* {showInlineAd && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-1 h-full">
                    <div className="h-full min-h-[110px] p-4 bg-blue-50/30 dark:bg-blue-900/10 border border-dashed border-blue-100 dark:border-blue-800/40 rounded-3xl flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] uppercase tracking-widest text-blue-500 font-black mb-2">Sponsored</span>
                      <div className="w-full h-12 bg-white/60 dark:bg-gray-800/60 rounded-lg flex items-center justify-center">
                         <p className="text-[10px] text-gray-400">Native Ad Unit</p>
                      </div>
                    </div>
                  </div>
                )} */}
              </Fragment>
            );
          })
        )}
      </div>

      {/* Bottom Ad Section */}
      {!loading && tags.length > 0 && (
        <div className="mt-16 w-full py-10 bg-gray-50/50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center rounded-3xl">
          <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-black mb-4">You might also like</span>
          <div className="w-full max-w-[970px] h-[250px] bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-center shadow-sm">
            <p className="text-xs text-gray-400 italic">Large Rectangle / Billboard Ad (970x250)</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && tags.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Hash size={48} className="text-gray-200 dark:text-gray-800 mb-4" />
          <p className="text-gray-500 font-medium">No tags found yet.</p>
        </div>
      )}
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import { useEffect, useState } from "react";

// export default function TagsPage() {
//   const [tags, setTags] = useState([]);

//   // Load top tags
//   useEffect(() => {
//     fetch("/api/tags-data")
//       .then((res) => res.json())
//       .then((data) => {
//         setTags(data.tags || []);
//       })
//       .catch((err) => console.error("Failed to fetch tags", err));
//   }, []);

//   return (
//     <div className="px-4 py-4 max-w-full mx-auto dark:bg-gray-950 min-h-screen transition-colors">
//       <h1 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
//         Browse by Tag
//       </h1>

//       <div className="-mx-4 px-4 overflow-x-scroll whitespace-nowrap mb-6 flex gap-3 no-scrollbar snap-x">
//         {tags.map((tag) => (
//           <Link
//             key={tag}
//             href={`/tags/${encodeURIComponent(tag)}`}
//             className={`px-4 py-2 border rounded-full shrink-0 text-sm snap-start transition-colors
//               bg-white text-black border-gray-300 hover:bg-gray-100
//               dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700`}
//           >
//             {tag}
//           </Link>
//         ))}
//       </div>
//     </div>
//   );
// }
