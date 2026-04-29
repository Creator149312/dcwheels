"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { Card } from "@components/ui/card";
import apiConfig from "@utils/ApiUrlConfig";
import { Layers, ArrowRight, Loader2 } from "lucide-react";
import AdsUnit from "@components/ads/AdsUnit";

const perPage = 10;

export default function LoadMoreWheels({ searchtitle, initialStart, total }) {
  const [wheelList, setWheelList] = useState([]);
  const [start, setStart] = useState(initialStart);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialStart < total);

  const fetchMore = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=${start}&limit=${perPage}`,
      );
      const data = await res.json();
      const newList = data.list || [];

      setWheelList((prev) => [...prev, ...newList]);
      const nextStart = start + perPage;
      setStart(nextStart);
      setHasMore(nextStart < total);
    } catch (err) {
      console.error("Failed to load more wheels:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:gap-4 w-full">
        {wheelList.map((item, i) => {
          // Ad logic remains consistent
          const globalIndex = initialStart + i;
          const showAd = (globalIndex + 1) % 5 === 0;

          return (
            <Fragment key={item._id || `loadmore-${i}`}>
              <Link href={`/uwheels/${item._id}`} className="block group w-full">
                {/* Enhanced Card: Added w-full and matched padding/hover effects to parent page */}
                <Card className="relative overflow-hidden p-3.5 md:p-6 border-none bg-white dark:bg-gray-900/50 backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/5 transition-all duration-500" />

                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
                      {/* Icon Container matched to parent sizing */}
                      <div className="flex-shrink-0 h-11 w-11 md:h-14 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-12 transition-all duration-300">
                        <Layers size={20} className="md:w-6 md:h-6" />
                      </div>

                      <div className="truncate">
                        <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate mb-0.5 md:mb-1">
                          {item.title}
                        </h2>
                        <div className="flex items-center">
                          <span className="px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                            {item.data?.length || 0} Segments
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-2">
                      <div className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center rounded-full border border-gray-100 dark:border-gray-800 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                        <ArrowRight
                          size={16}
                          className="text-gray-400 md:w-[18px] md:h-[18px] group-hover:text-white group-hover:translate-x-0.5 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>

              {/* ✅ Responsive Ad Injection */}
              {showAd && <AdsUnit slot={"4694567949"} />}
            </Fragment>
          );
        })}

        {/* Load More Button Wrapper: spans full width to center correctly */}
        {hasMore && (
          <div className="flex justify-center w-full mt-10 mb-10">
            <button
              onClick={fetchMore}
              disabled={loading}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>LOADING...</span>
                </>
              ) : (
                "LOAD MORE RESULTS"
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// "use client";

// import { useState } from "react";
// import { Card } from "@components/ui/card";
// import apiConfig from "@utils/ApiUrlConfig";

// const perPage = 10;

// export default function LoadMoreWheels({ searchtitle, initialStart, total }) {
//   const [wheelList, setWheelList] = useState([]);
//   const [start, setStart] = useState(initialStart);
//   const [loading, setLoading] = useState(false);
//   const [hasMore, setHasMore] = useState(initialStart < total);

//   const fetchMore = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(
//         `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=${start}&limit=${perPage}`
//       );
//       const { list } = await res.json();
//       setWheelList((prev) => [...prev, ...list]);
//       setStart((prev) => prev + perPage);
//       setHasMore(start + perPage < total);
//     } catch (err) {
//       console.error("Failed to load more wheels:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       {wheelList.map((item, i) => (
//         <a href={`/uwheels/${item._id}`} key={`loadmore-${i}`}>
//           <Card
//             className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800
//               hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1
//               transition-all duration-300 ease-in-out
//               focus:outline-none focus:ring-2 focus:ring-blue-500"
//             tabIndex={0}
//           >
//             <div className="text-base leading-normal flex justify-between items-center">
//               <div className="w-[80%]">
//                 <h2 className="font-medium mb-1">{item.title}</h2>
//               </div>
//               <span className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full font-semibold">
//                 {item.data.length}
//               </span>
//             </div>
//           </Card>
//         </a>
//       ))}

//       {hasMore && (
//         <div className="text-center mt-6">
//           <button
//             onClick={fetchMore}
//             disabled={loading}
//             className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600 disabled:opacity-50"
//           >
//             {loading ? "Loading..." : "Load More"}
//           </button>
//         </div>
//       )}
//     </>
//   );
// }
