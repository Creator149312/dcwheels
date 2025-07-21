import { useState } from "react";
import { HiMenu, HiX } from "react-icons/hi";

const categories = [
  "All",
  "Music",
  "Films",
  "Gaming",
  "Sports",
  "Education",
  "Food",
  "Travel",
];

export default function CategoryMenu() {
  const [open, setOpen] = useState(false);

  return (<></>
    // <>
    //   {/* Toggle Button */}
    //   <button
    //     onClick={() => setOpen(!open)}
    //     className="p-2 m-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
    //   >
    //     {open ? <HiX size={24} /> : <HiMenu size={24} />}
    //   </button>

    //   {/* Sidebar Menu */}
    //   <div
    //     className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#1f1f1f] shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
    //       open ? "translate-x-0" : "-translate-x-full"
    //     }`}
    //   >
    //     <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
    //       <h2 className="text-xl font-semibold">Categories</h2>
    //     </div>
    //     <ul className="px-4 py-2 space-y-2">
    //       {categories.map((category) => (
    //         <li
    //           key={category}
    //           className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-2 cursor-pointer"
    //         >
    //           {category}
    //         </li>
    //       ))}
    //     </ul>
    //   </div>

    //   {/* Background overlay (optional) */}
    //   {open && (
    //     <div
    //       className="fixed inset-0 bg-black bg-opacity-30 z-40"
    //       onClick={() => setOpen(false)}
    //     />
    //   )}
    // </>
  );
}
