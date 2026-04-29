"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, PlusCircle, Sparkles, LayoutGrid, ChevronDown } from "lucide-react";
import { useSession } from "next-auth/react";
import UserInfo from "@components/UserInfo";
import { HiViewList } from "react-icons/hi";
import MobileSearchBar from "@components/MobileSearchBar";
import { BiSidebar } from "react-icons/bi";
import { GiCartwheel } from "react-icons/gi";

// Modal is only needed when the user clicks Create. Lazy-loading keeps it
// out of the shared bundle that ships on every page.
const CreateWheelModal = dynamic(
  () => import("@components/CreateWheelModal"),
  { ssr: false }
);

const Navbar = ({ onToggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const { status, data: session } = useSession();

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

          <Link href="/" className="flex items-center group gap-2">
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
          </Link>
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

            <Link
              href="/recommendation"
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl transition-all"
            >
              <Sparkles size={18} />
              Can&apos;t Decide?
            </Link>

            {/* Explore Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-blue-600 rounded-xl">
                <LayoutGrid size={18} />
                Explore
                <ChevronDown size={14} className="group-hover:rotate-180 transition-transform" />
              </button>

              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-2xl rounded-2xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[70]">
                <Link href="/wheels" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition-colors">
                  <GiCartwheel size={18} /> Wheels
                </Link>
                <Link href="/lists" className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-gray-200 hover:text-blue-600 transition-colors">
                  <HiViewList size={18} /> Lists
                </Link>
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
          <Link href="/recommendation" onClick={() => setOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50">
             <Sparkles className="text-yellow-500" size={22} /> Can&apos;t Decide?
          </Link>
          
          <div className="border-t border-gray-100 dark:border-gray-800 my-4 pt-6">
            <p className="text-[10px] font-black uppercase text-gray-400 mb-4 px-4 tracking-widest">Explore</p>
            <Link href="/wheels" onClick={() => setOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50">
               <GiCartwheel size={22} className="text-blue-500" /> Browse Wheels
            </Link>
            <Link href="/lists" onClick={() => setOpen(false)} className="flex items-center gap-4 p-4 rounded-2xl font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50">
               <HiViewList size={22} className="text-indigo-500" /> Collections
            </Link>
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
