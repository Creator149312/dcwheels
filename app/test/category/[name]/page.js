'use client';

import { useParams } from 'next/navigation'; // or useRouter from 'next/router' if using /pages
// import SidebarMenu from '@/components/SidebarMenu';

const dummyData = Array.from({ length: 12 }, (_, i) => ({
  title: `Sample Wheel ${i + 1}`,
  description: 'A short wheel description.',
  thumbnail: '/thumbnail-placeholder.png',
}));

export default function CategoryPage() {
  const { name } = useParams(); // if using app directory

  return (<></>
//     <div className="flex flex-col md:flex-row min-h-screen">
//       {/* Sidebar only visible on desktop */}
//       {/* <div className="hidden md:block md:w-64 bg-white dark:bg-[#1a1a1a] border-r border-gray-200 dark:border-gray-800">
//         <SidebarMenu />
//       </div> */}

//       {/* Main content takes full remaining width */}
//    <main className="flex-1 w-full p-4">
//   <h1 className="text-2xl font-bold capitalize mb-4">{name} Wheels</h1>

//   {/* 4-column grid layout */}
//   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
//     {dummyData.map((item, index) => (
//       <div
//         key={index}
//         className="bg-white dark:bg-[#1f1f1f] shadow rounded-md overflow-hidden hover:shadow-lg transition"
//       >
//         <img
//           src={item.thumbnail}
//           alt={item.title}
//           className="w-full h-40 object-cover"
//         />
//         <div className="p-3">
//           <h3 className="font-semibold text-base mb-1 truncate">
//             {item.title}
//           </h3>
//           <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
//             {item.description}
//           </p>
//         </div>
//       </div>
//     ))}
//   </div>
// </main>

//     </div>
  );
}
