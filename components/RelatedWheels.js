"use client";

import { GiCartwheel } from "react-icons/gi";
import { HiLightningBolt } from "react-icons/hi";
import Image from "next/image";

export default function RelatedWheels({ relatedWheels }) {
  return (
    <aside className="hidden lg:block w-full p-0">
      {/* Sleek Minimalist Header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <HiLightningBolt className="text-blue-500" size={14} />
        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          Up Next
        </h4>
        <div className="flex-1 h-[1px] bg-gray-100 dark:bg-gray-800 ml-2" />
      </div>

      {/* Compact List Container — height is driven by the parent aside
          (which stretches to match the wheel card via grid stretch). */}
      <div className="space-y-1.5 pr-1">
        {relatedWheels.map((wheel) => (
          <a
            key={wheel._id}
            href={`/uwheels/${wheel._id}`}
            className="group flex items-center gap-3 p-2 rounded-xl bg-transparent hover:bg-gray-50 dark:hover:bg-blue-500/5 border border-transparent hover:border-gray-100 dark:hover:border-blue-500/20 transition-all duration-200 active:scale-[0.98]"
          >
            {/* Thumbnail */}
            <div className="relative flex-shrink-0 w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
              {wheel.wheelPreview ? (
                <Image
                  src={wheel.wheelPreview}
                  alt=""
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <GiCartwheel className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-white transition-colors" />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className="font-bold text-xs line-clamp-2 text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {wheel.title}
              </span>
            </div>
          </a>
        ))}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
        }
      `}</style>
    </aside>
  );
}

// "use client";

// export default function RelatedWheels({ relatedWheels }) {
//   return (
//     <aside
//       className="hidden lg:block 
//                  lg:w-64 xl:w-80 
//                  p-1 min-h-[24rem] 
//                 "
//     >
//       <h4
//         className="text-base font-semibold mb-4 text-center 
//                    bg-gray-100 dark:bg-gray-800 
//                    text-gray-900 dark:text-gray-100 
//                    py-2 rounded px-0"
//       >
//         Wheels Mix
//       </h4>

//       <div className="space-y-4 max-h-[400px] overflow-y-auto">
//         {relatedWheels.map((wheel) => (
//           <a
//             key={wheel._id}
//             href={`/uwheels/${wheel._id}`}
//             className="flex items-center space-x-3 cursor-pointer 
//                        hover:bg-gray-100 dark:hover:bg-gray-800 
//                        p-2 rounded-lg transition border border-transparent 
//                        hover:border-gray-300 dark:hover:border-gray-600"
//           >
//             {/* Wheel icon instead of thumbnail */}
//             {/* <div
//               className="flex-shrink-0 flex items-center justify-center 
//                          w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700"
//             >
//               <GiCartwheel className="w-7 h-7 text-gray-700 dark:text-gray-300" />
//             </div> */}

//             {/* Text content */}
//             <div className="flex flex-col">
//               <span
//                 className="font-medium text-sm line-clamp-2 
//                            text-gray-900 dark:text-gray-100"
//               >
//                 {wheel.title}
//               </span>
//               <span className="text-xs text-gray-500 dark:text-gray-400">
//                 {wheel.data?.length} items
//               </span>
//             </div>
//           </a>
//         ))}
//       </div>
//     </aside>
//   );
// }
