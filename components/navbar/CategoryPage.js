import { useRouter } from "next/router";
import SidebarMenu from "@/components/SidebarMenu";

const dummyData = Array.from({ length: 12 }, (_, i) => ({
  title: `Sample Wheel ${i + 1}`,
  description: "A short wheel description.",
  thumbnail: "/thumbnail-placeholder.png", // Replace with your own image paths
}));

export default function CategoryPage() {
  const router = useRouter();
  const { name } = router.query;

  return (<></>
    // <div className="flex min-h-screen">
    //   {/* Collapsible sidebar (optional if sticky nav already has toggle) */}
    //   <SidebarMenu />

    //   {/* Main content */}
    //   <div className="flex-1 p-4 md:ml-64">
    //     <h1 className="text-2xl font-bold capitalize mb-4">{name} Wheels</h1>

    //     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    //       {dummyData.map((item, index) => (
    //         <div
    //           key={index}
    //           className="bg-white dark:bg-[#1f1f1f] shadow rounded-md overflow-hidden hover:shadow-lg transition"
    //         >
    //           <img
    //             src={item.thumbnail}
    //             alt={item.title}
    //             className="w-full h-40 object-cover"
    //           />
    //           <div className="p-3">
    //             <h3 className="font-semibold text-base mb-1 truncate">
    //               {item.title}
    //             </h3>
    //             <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
    //               {item.description}
    //             </p>
    //           </div>
    //         </div>
    //       ))}
    //     </div>
    //   </div>
    // </div>
  );
}
