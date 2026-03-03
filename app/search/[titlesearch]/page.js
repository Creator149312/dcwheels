import LoadMoreWheels from "./LoadMoreWheels";
import { Card } from "@components/ui/card";
import apiConfig from "@utils/ApiUrlConfig";
import { Fragment } from "react";
import { Search, ArrowRight, Layers, Sparkles, Plus } from "lucide-react";
import AdsUnit from "@components/ads/AdsUnit";

const perPage = 10;

async function fetchInitialWheels(searchtitle) {
  const res = await fetch(
    `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=0&limit=${perPage}`,
    { next: { revalidate: 3600 } },
  );
  if (!res.ok) throw new Error("Failed to fetch wheels");
  return res.json();
}

export default async function Page({ params }) {
  const searchtitle = decodeURIComponent(params.titlesearch);
  let list = [];
  let total = 0;

  try {
    const data = await fetchInitialWheels(searchtitle);
    list = data.list || [];
    total = data.total || 0;
  } catch {
    list = [];
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="relative mb-6 md:mb-8">
          <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
          <div className="relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 rounded-3xl shadow-xl">
            <Search className="w-10 h-10 md:w-12 md:h-12 text-blue-500" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-2">
          Nothing turned up...
        </h2>
        <p className="text-sm md:text-base text-gray-500 max-w-xs md:max-w-sm mb-8 leading-relaxed">
          We couldn't find any wheels matching{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-200">
            "{searchtitle}"
          </span>
          .
        </p>
        <a
          href="/"
          className="group flex items-center space-x-2 px-6 py-3 md:px-8 md:py-4 bg-gray-900 dark:bg-white dark:text-black text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl active:scale-95 text-sm md:text-base"
        >
          <Plus size={18} />
          <span>Create Custom Wheel</span>
        </a>
      </div>
    );
  }

  return (
    // Reduced outer padding for mobile (px-4 vs px-6) and vertical spacing (py-6 vs py-12)
    <div className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-12">
      {/* Header Section */}
      <header className="relative mb-6 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 md:gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1 md:mb-2">
              <Sparkles size={14} className="text-blue-500" />
              <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-black text-blue-500">
                Search Results
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
              Showing{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
                "{searchtitle}"
              </span>
            </h1>
            <p className="text-xs md:text-sm text-gray-400 mt-1 md:mt-2 font-medium">
              Found {total} interactive wheels
            </p>
          </div>
        </div>
      </header>

      {/* Results Grid - Reduced gap from 4 to 3 on mobile */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {list.map((item, index) => (
          <Fragment key={item._id}>
            <a href={`/uwheels/${item._id}`} className="group">
              {/* Reduced padding from p-5 to p-3.5 on mobile */}
              <Card className="group relative overflow-hidden border-none bg-white dark:bg-gray-900/50 backdrop-blur-sm shadow-sm p-3.5 md:p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 to-blue-600/0 group-hover:from-blue-600/5 transition-all duration-500" />

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-5 min-w-0">
                    {/* Smaller icon container on mobile (h-11 w-11) */}
                    <div className="relative flex-shrink-0 h-11 w-11 md:h-14 md:w-14 flex items-center justify-center rounded-xl md:rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-12 transition-all duration-300">
                      <Layers size={20} className="md:w-6 md:h-6" />
                    </div>
                    <div className="truncate">
                      <h2 className="text-base md:text-xl font-bold text-gray-900 dark:text-white truncate mb-0.5 md:mb-1">
                        {item.title}
                      </h2>
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                          {item.data.length} Segments
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0 ml-2">
                    {/* Smaller arrow container on mobile */}
                    <div className="h-8 w-8 md:h-10 md:w-10 flex items-center justify-center rounded-full border border-gray-100 dark:border-gray-800 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                      <ArrowRight
                        size={16}
                        className="text-gray-400 md:w-[18px] md:h-[18px] group-hover:text-white group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </a>

            {/* Adjusted Ad Injection for Mobile */}
            {(index + 1) % 5 === 0 && <AdsUnit slot={"4694567949"} />}
          </Fragment>
        ))}
      </div>

      {/* Reduced bottom margin on mobile */}
      <div className="mt-10 md:mt-16 flex justify-center">
        <LoadMoreWheels
          searchtitle={searchtitle}
          initialStart={perPage}
          total={total}
        />
      </div>
    </div>
  );
}

// import LoadMoreWheels from "./LoadMoreWheels";
// import { Card } from "@components/ui/card";
// import apiConfig from "@utils/ApiUrlConfig";
// // import AnimeSection from "./AnimeSection";
// // import GameSection from "./GameSection";

// const perPage = 10;

// async function fetchInitialWheels(searchtitle) {
//   const res = await fetch(
//     `${apiConfig.apiUrl}/wheel/search/${searchtitle}?start=0&limit=${perPage}`,
//     {
//       // cache results for 1 hour, avoids repeated fetches
//       next: { revalidate: 3600 },
//     }
//   );
//   if (!res.ok) throw new Error("Failed to fetch wheels");
//   return res.json();
// }

// export async function generateMetadata({ params }) {
//   const searchtitle = params.titlesearch;
//   try {
//     const { total } = await fetchInitialWheels(searchtitle);
//     return {
//       title: `Search: ${searchtitle}`,
//       description: `Explore spin wheels related to ${searchtitle}.`,
//     };
//   } catch {
//     return {
//       title: "No Wheels Found",
//       description: "No Wheels Found",
//     };
//   }
// }

// export default async function Page({ params }) {
//   const searchtitle = decodeURIComponent(params.titlesearch);

//   let list = [];
//   let total = 0;

//   try {
//     const data = await fetchInitialWheels(searchtitle);
//     list = data.list || [];
//     total = data.total || 0;
//   } catch {
//     list = [];
//   }

//   if (list.length === 0) {
//     return (
//       <div className="text-center mt-6">
//         <p className="text-gray-700 dark:text-gray-300">
//           We cannot find any wheels related to <strong>{searchtitle}</strong>.
//         </p>
//         <div className="mt-4">
//           <a
//             href="/"
//             className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition dark:bg-blue-500 dark:hover:bg-blue-600"
//           >
//             Create a New Wheel
//           </a>
//         </div>
//       </div>
//     );
//   }

//   // Pre-slice once for clarity
//   const firstFive = list.slice(0, 5);
//   const remaining = list.slice(5);

//   return (
//     <div className="m-3 p-3">
//       <h1 className="text-xl font-semibold mb-4">
//         Search Results: {searchtitle}
//       </h1>

//       {/* First 5 wheels */}
//       {firstFive.map((item) => (
//         <a href={`/uwheels/${item._id}`} key={item._id}>
//           <Card
//             className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800
//               hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1
//               transition-all duration-300 ease-in-out
//               focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <div className="flex justify-between items-center">
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

//       {/* Anime section could be streamed later if needed */}
//       {/* <Suspense fallback={<p>Loading anime…</p>}>
//         <AnimeSection searchtitle={searchtitle} />
//       </Suspense> */}

//       {/* Remaining wheels */}
//       {remaining.map((item) => (
//         <a href={`/uwheels/${item._id}`} key={item._id}>
//           <Card
//             className="p-4 sm:p-6 mt-4 rounded-md bg-white dark:bg-gray-800
//               hover:shadow-xl hover:scale-[1.01] hover:-translate-y-1
//               transition-all duration-300 ease-in-out
//               focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <div className="flex justify-between items-center">
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

//       {/* Game section could be streamed later if needed */}
//       {/* <Suspense fallback={<p>Loading games…</p>}>
//         <GameSection searchtitle={searchtitle} />
//       </Suspense> */}

//       {/* Load more wheels */}
//       <LoadMoreWheels
//         searchtitle={searchtitle}
//         initialStart={perPage}
//         total={total}
//       />
//     </div>
//   );
// }
