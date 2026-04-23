"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X, PlusCircle, Sparkles, LayoutGrid, ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";
import UserInfo from "@components/UserInfo";
import { HiViewList } from "react-icons/hi";
import { useRouter, usePathname } from "next/navigation";
import MobileSearchBar from "@components/MobileSearchBar";
import { BiSidebar } from "react-icons/bi";
import { GiCartwheel } from "react-icons/gi";
import CreateWheelModal from "@components/CreateWheelModal";

const Navbar = ({ onToggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { status, data: session } = useSession();
  const router = useRouter();
  const currentPath = usePathname();

  const handleCreateClick = (event) => {
    event.preventDefault();
    setOpen(false);
    setCreateModalOpen(true);
  };

  return (
    <nav className="hidden md:block fixed top-0 left-0 right-0 z-[60] h-14 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 transition-all duration-300">
      <div className="h-full max-w-[1800px] mx-auto flex items-center justify-between px-2 md:px-4">
        
        {/* Left: Sidebar Toggle & Logo */}
        <div className="flex items-center gap-1 md:gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <BiSidebar size={24} />
          </button>

          <a href="/" className="flex items-center group gap-2">
            <Image
              src="/spin-wheel-logo.png"
              alt="logo"
              width="36"
              height="36"
              priority
              className="h-8 w-8 md:h-9 md:w-9"
            />
            <span className="text-lg md:text-xl font-black tracking-tighter text-gray-900 dark:text-white uppercase">
              Spin<span className="text-blue-600">Papa</span>
            </span>
          </a>
        </div>

        {/* Center: Search (Desktop Only) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8">
          <MobileSearchBar />
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 md:gap-6">
          
          {/* Mobile Search Icon Trigger */}
          <div className="md:hidden">
            <MobileSearchBar />
          </div>

          {/* RESTORED: Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={handleCreateClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all"
            >
              <PlusCircle size={18} />
              Create
            </button>

            <a
              href="/recommendation"
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all"
            >
              <Sparkles size={18} />
              Can't Decide?
            </a>

            {/* Explore Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-blue-600 rounded-xl">
                <LayoutGrid size={18} />
                Explore
                <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
              </button>

              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl rounded-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[70]">
                <a href="/wheels" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition-colors">
                  <GiCartwheel size={18} /> Wheels
                </a>
                <a href="/lists" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition-colors">
                  <HiViewList size={18} /> Lists
                </a>
              </div>
            </div>
          </div>

          <div className="hidden md:block h-6 w-[1px] bg-gray-200 dark:bg-gray-800 mx-2" />

          {/* User Section & Hamburger */}
          <div className="flex items-center gap-3">
             <UserInfo name={session?.user?.name} status={status} />
             <button
                className="md:hidden p-2 text-gray-600 dark:text-gray-300"
                onClick={() => setOpen(!open)}
              >
                {open ? <X size={26} /> : <Menu size={26} />}
              </button>
          </div>
        </div>
      </div>

      {/* FIXED: SOLID NON-TRANSPARENT OVERLAY */}
      <div 
        className={`fixed inset-0 z-[200] md:hidden transition-all duration-300 ${
          open 
            ? "opacity-100 visible bg-gray-900/90 dark:bg-black/95 backdrop-blur-md" 
            : "opacity-0 invisible pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* FIXED: MOBILE DRAWER */}
      <div
        className={`fixed top-0 bottom-0 right-0 w-[280px] z-[210] p-6 shadow-2xl md:hidden transition-transform duration-500 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        } bg-white dark:bg-gray-950 border-l border-gray-100 dark:border-gray-900`}
      >
        <div className="flex justify-between items-center mb-10">
           <span className="text-xl font-black text-gray-900 dark:text-white uppercase">
             Spin<span className="text-blue-600">Papa</span>
           </span>
           <button onClick={() => setOpen(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-600 dark:text-white">
             <X size={20} />
           </button>
        </div>

        <nav className="flex flex-col gap-3">
          <button onClick={handleCreateClick} className="flex items-center gap-4 p-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-500/20 w-full">
             <PlusCircle size={22} /> Create New Wheel
          </button>
          <a href="/recommendation" onClick={() => setOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50">
             <Sparkles className="text-yellow-500" size={22} /> Can't Decide?
          </a>
          
          <div className="border-t border-gray-100 dark:border-gray-800 my-4 pt-6">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-4 px-4 tracking-widest">Explore</p>
            <a href="/wheels" onClick={() => setOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50">
               <GiCartwheel size={22} className="text-blue-500" /> Browse Wheels
            </a>
            <a href="/lists" onClick={() => setOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50">
               <HiViewList size={22} className="text-indigo-500" /> Collections
            </a>
          </div>
        </nav>
      </div>
      <CreateWheelModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </nav>
  );
};

export default Navbar;


// "use client";

// import { useState } from "react";
// import { Menu, X } from "lucide-react";
// import { useSession } from "next-auth/react";
// import UserInfo from "@components/UserInfo";
// import {
//   HiCollection,
//   HiOutlinePlusSm,
//   HiPlus,
//   HiViewList,
// } from "react-icons/hi";
// import { useRouter, usePathname } from "next/navigation";
// import MobileSearchBar from "@components/MobileSearchBar";
// import { BiSidebar } from "react-icons/bi";
// import { FaDice } from "react-icons/fa";
// import { GiCartwheel } from "@node_modules/react-icons/gi";

// const Navbar = ({ onToggleSidebar }) => {
//   const [open, setOpen] = useState(false);
//   const [exploreOpen, setExploreOpen] = useState(false); // ✅ mobile dropdown
//   const { status, data: session } = useSession();
//   const router = useRouter();
//   const currentPath = usePathname();

//   const handleNewWheelClick = (event) => {
//     event.preventDefault();
//     localStorage.removeItem("SpinpapaWheel");
//     if (currentPath === "/") {
//       window.location.reload();
//     } else router.push("/");
//   };

//   return (
//     <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-white dark:bg-gray-950 shadow pr-4">
//       <div className="flex items-center justify-between py-2">
//         {/* Left: Sidebar Toggle */}
//         <div className="w-16 flex justify-center items-center">
//           <button
//             onClick={onToggleSidebar}
//             className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
//           >
//             <BiSidebar size={26} />
//           </button>
//         </div>

//         {/* Logo */}
//         <div className="flex items-center shrink-0">
//           <a href="/" className="text-2xl font-semibold flex items-center">
//             <img
//               src={"/spin-wheel-logo.png"}
//               alt="logo"
//               className="md:cursor-pointer h-9 pr-2"
//             />
//             SpinPapa
//           </a>
//         </div>

//         {/* Desktop Search */}
//         <div className="hidden md:flex flex-grow justify-center px-4">
//           <div className="w-full max-w-xl">
//             <MobileSearchBar />
//           </div>
//         </div>

//         {/* Right Side */}
//         <div className="flex items-center sm:gap-4">
//           <div className="md:hidden">
//             <MobileSearchBar />
//           </div>

//           {/* Desktop Menu */}
//           <ul className="hidden md:flex gap-6 items-center">
//             <li>
//               <a
//                 href="/"
//                 className="inline-flex items-center text-lg"
//                 onClick={handleNewWheelClick}
//               >
//                 <span className="mr-2 hover:font-semibold">
//                   <HiOutlinePlusSm size={26} />
//                 </span>
//                 Create
//               </a>
//             </li>

//             <li>
//               <a
//                 href="/recommendation"
//                 className="inline-flex items-center text-lg"
//               >
//                 <span className="mr-2 hover:font-semibold">
//                   <FaDice size={22} />
//                 </span>
//                 Surprise Me
//               </a>
//             </li>

//             {/* ✅ Desktop Dropdown */}
//             <li className="relative group">
//               <button className="inline-flex items-center text-lg">
//                 <span className="mr-2 hover:font-semibold">
//                   <HiCollection size={26} />
//                 </span>
//                 Explore
//               </button>

//               {/* Dropdown Menu */}
//               <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-lg opacity-0 group-hover:opacity-100 group-hover:visible invisible transition-all">
//                 <a
//                   href="/wheels"
//                   className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
//                 >
//                   <GiCartwheel
//                     size={20}
//                     className="mr-2 text-gray-600 dark:text-gray-300"
//                   />
//                   Wheels
//                 </a>

//                 <a
//                   href="/lists"
//                   className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
//                 >
//                   <HiViewList
//                     size={20}
//                     className="mr-2 text-gray-600 dark:text-gray-300"
//                   />
//                   Lists
//                 </a>
//               </div>
//             </li>

//             <li>
//               <UserInfo name={session?.user?.name} status={status} />
//             </li>
//           </ul>

//           {/* Mobile Menu Icon */}
//           <div
//             className="text-3xl md:hidden z-40"
//             onClick={() => setOpen(!open)}
//           >
//             {open ? <X size={28} /> : <Menu size={28} />}
//           </div>
//         </div>
//       </div>

//       {/* ✅ Mobile Navigation Drawer */}
//       <ul
//         className={`z-20 md:hidden dark:bg-[#020817] bg-white fixed top-0 bottom-0 right-0 overflow-y-auto
//           w-64 max-w-[80%] py-10 pl-4 gap-3 duration-500 ease-in-out
//           ${open ? "translate-x-0" : "translate-x-full"}
//           transition-transform`}
//       >
//         <li className="pt-5 pb-3">
//           <a href="/" className="inline-flex items-center text-lg">
//             <span className="mr-2 hover:font-semibold">
//               <HiPlus size={28} />
//             </span>
//             Create
//           </a>
//         </li>

//         <li>
//           <a
//             href="/recommendation"
//             className="inline-flex items-center text-lg"
//           >
//             <span className="mr-2 hover:font-semibold">
//               <FaDice size={22} />
//             </span>
//             Surprise Me
//           </a>
//         </li>
//         {/* ✅ Mobile Dropdown (Accordion) */}
//         <li className="py-3">
//           <button
//             onClick={() => setExploreOpen(!exploreOpen)}
//             className="inline-flex items-center text-lg w-full"
//           >
//             <span className="mr-2 hover:font-semibold">
//               <HiCollection size={28} />
//             </span>
//             Explore
//           </button>

//           {exploreOpen && (
//             <div className="ml-10 mt-2 flex flex-col gap-3">
//               <a
//                 href="/wheels"
//                 className="flex items-center text-lg hover:underline"
//               >
//                 <GiCartwheel
//                   size={22}
//                   className="mr-2 text-gray-500 dark:text-gray-300"
//                 />
//                 Wheels
//               </a>

//               <a
//                 href="/lists"
//                 className="flex items-center text-lg hover:underline"
//               >
//                 <HiViewList
//                   size={22}
//                   className="mr-2 text-gray-500 dark:text-gray-300"
//                 />
//                 Lists
//               </a>
//             </div>
//           )}
//         </li>

//         <li>
//           <div className="py-3 mr-2">
//             <UserInfo
//               name={session?.user?.name}
//               status={status}
//               setOpen={setOpen}
//             />
//           </div>
//         </li>
//       </ul>
//     </nav>
//   );
// };

// export default Navbar;
