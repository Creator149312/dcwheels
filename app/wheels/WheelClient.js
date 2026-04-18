"use client";

import { useState, Fragment, useEffect } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import AdsUnit from "@components/ads/AdsUnit";

export default function WheelsClient({ initialWheels }) {
  const [wheels, setWheels] = useState(initialWheels);
  const [skip, setSkip] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialWheels.length >= 20);
  const [isMobile, setIsMobile] = useState(null);

  // Handle responsive ad logic
  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 1024);
    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  async function loadMore() {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/page/all?limit=20&skip=${skip}`);
      const data = await res.json();
      const newWheels = data.wheels || [];

      if (newWheels.length > 0) {
        setWheels((prev) => [...prev, ...newWheels]);
        setSkip((prev) => prev + 20);
      }

      if (newWheels.length < 20) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  // Define intervals: Every 6 items on mobile, 10 on desktop
  // null means not mounted yet — suppress ads until client determines device
  const adInterval = isMobile === null ? null : isMobile ? 6 : 10;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-950 min-h-screen transition-colors">
      <header className="mb-8 border-b border-gray-100 dark:border-gray-900 pb-4">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">
          All <span className="text-blue-600">Wheels</span>
        </h1>
      </header>

      {wheels.length === 0 && !loading && (
        <div className="text-gray-500 text-center mt-20">No wheels found.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {wheels.map((wheel, index) => {
          // Check if we should show an ad after this specific item
          const showAd = adInterval !== null && (index + 1) % adInterval === 0;

          return (
            <Fragment key={wheel._id || index}>
              <a
                href={`/wheels/${wheel.slug}`}
                className="group flex flex-col bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:border-blue-500 transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-blue-500/5"
              >
                <div className="relative aspect-[4/3] w-full bg-white dark:bg-gray-800 flex items-center justify-center border-b border-gray-100 dark:border-gray-800 overflow-hidden">
                  {wheel.wheelPreview ? (
                    <img 
                      src={wheel.wheelPreview} 
                      alt={wheel.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <span className="text-gray-200 dark:text-gray-700 text-5xl font-black group-hover:scale-110 transition-transform duration-500">
                      {wheel.title?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="p-3 md:p-4">
                  <h3 className="text-sm md:text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-tight">
                    {wheel.title}
                  </h3>
                </div>
              </a>

              {/* ✅ Responsive Ad Injection using col-span-full */}
              {showAd && (
                <div className="col-span-full my-4 md:my-6">
                  <div className="w-full py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center">
                    <AdsUnit slot={"4694567949"} />
                  </div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {hasMore && (
        <div className="flex flex-col items-center justify-center mt-12 mb-10">
          <button
            onClick={loadMore}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>LOADING...</span>
              </>
            ) : (
              "LOAD MORE WHEELS"
            )}
          </button>
          <p className="text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-widest">
            Showing {wheels.length} wheels
          </p>
        </div>
      )}
    </div>
  );
}

// "use client";

// import { useState } from "react";
// import Link from "next/link";

// export default function WheelsClient({ initialWheels }) {
//   const [wheels, setWheels] = useState(initialWheels);
//   const [skip, setSkip] = useState(20);
//   const [loading, setLoading] = useState(false);
//   const [hasMore, setHasMore] = useState(initialWheels.length === 20);

//   // ✅ Load More handler
//   async function loadMore() {
//     setLoading(true);

//     const res = await fetch(`/api/page/all?limit=20&skip=${skip}`);
//     const data = await res.json();

//     const newWheels = data.wheels || [];

//     setWheels((prev) => [...prev, ...newWheels]);
//     setSkip((prev) => prev + 20);

//     if (newWheels.length < 20) {
//       setHasMore(false);
//     }

//     setLoading(false);
//   }

//   return (
//     <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
//       <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
//         All Wheels
//       </h1>

//       {/* ✅ Empty State */}
//       {wheels.length === 0 && (
//         <div className="text-gray-500 dark:text-gray-400 text-center mt-20">
//           No wheels found.
//         </div>
//       )}

//       {/* ✅ Wheels Grid */}
//       <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
//         {wheels.map((wheel) => (
//           <Link
//             key={wheel._id}
//             href={`/wheels/${wheel.slug}`}
//             className="block bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden hover:shadow-lg transition"
//           >
//             {/* ✅ Cover Placeholder (First Letter of Title) */}
//             <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
//               <span className="text-gray-400 dark:text-gray-500 text-4xl font-bold">
//                 {wheel.title?.charAt(0).toUpperCase()}
//               </span>
//             </div>

//             {/* ✅ Text Content */}
//             <div className="p-4">
//               <h3 className="font-semibold text-gray-900 dark:text-gray-100">
//                 {wheel.title}
//               </h3>
//             </div>
//           </Link>
//         ))}
//       </div>

//       {/* ✅ Load More Button */}
//       {hasMore && (
//         <div className="text-center mt-8">
//           <button
//             onClick={loadMore}
//             disabled={loading}
//             className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
//           >
//             {loading ? "Loading..." : "Load More"}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }
