"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";
import UserInfo from "@components/UserInfo";
import {
  HiCollection,
  HiOutlinePlusSm,
  HiPlus,
  HiViewList,
} from "react-icons/hi";
import { useRouter, usePathname } from "next/navigation";
import MobileSearchBar from "@components/MobileSearchBar";
import { BiSidebar } from "react-icons/bi";
import { FaDice } from "react-icons/fa";
import { GiCartwheel } from "@node_modules/react-icons/gi";

const Navbar = ({ onToggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false); // ✅ mobile dropdown
  const { status, data: session } = useSession();
  const router = useRouter();
  const currentPath = usePathname();

  const handleNewWheelClick = (event) => {
    event.preventDefault();
    localStorage.removeItem("SpinpapaWheel");
    if (currentPath === "/") {
      window.location.reload();
    } else router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-950 shadow pr-4">
      <div className="flex items-center justify-between py-2">
        {/* Left: Sidebar Toggle */}
        <div className="w-16 flex justify-center items-center">
          <button
            onClick={onToggleSidebar}
            className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
          >
            <BiSidebar size={26} />
          </button>
        </div>

        {/* Logo */}
        <div className="flex items-center shrink-0">
          <a href="/" className="text-2xl font-semibold flex items-center">
            <img
              src={"/spin-wheel-logo.png"}
              alt="logo"
              className="md:cursor-pointer h-9 pr-2"
            />
            SpinPapa
          </a>
        </div>

        {/* Desktop Search */}
        <div className="hidden md:flex flex-grow justify-center px-4">
          <div className="w-full max-w-xl">
            <MobileSearchBar />
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center sm:gap-4">
          <div className="md:hidden">
            <MobileSearchBar />
          </div>

          {/* Desktop Menu */}
          <ul className="hidden md:flex gap-6 items-center">
            <li>
              <a
                href="/"
                className="inline-flex items-center text-lg"
                onClick={handleNewWheelClick}
              >
                <span className="mr-2 hover:font-semibold">
                  <HiOutlinePlusSm size={26} />
                </span>
                Create
              </a>
            </li>

            <li>
              <a
                href="/recommendation"
                className="inline-flex items-center text-lg px-3 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                <span className="mr-2">
                  <FaDice size={22} />
                </span>
                Surprise Me
              </a>
            </li>

            {/* ✅ Desktop Dropdown */}
            <li className="relative group">
              <button className="inline-flex items-center text-lg">
                <span className="mr-2 hover:font-semibold">
                  <HiCollection size={26} />
                </span>
                Explore
              </button>

              {/* Dropdown Menu */}
              <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 shadow-lg rounded-lg opacity-0 group-hover:opacity-100 group-hover:visible invisible transition-all">
                <a
                  href="/wheels"
                  className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <GiCartwheel
                    size={20}
                    className="mr-2 text-gray-600 dark:text-gray-300"
                  />
                  Wheels
                </a>

                <a
                  href="/lists"
                  className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <HiViewList
                    size={20}
                    className="mr-2 text-gray-600 dark:text-gray-300"
                  />
                  Lists
                </a>
              </div>
            </li>

            <li>
              <UserInfo name={session?.user?.name} status={status} />
            </li>
          </ul>

          {/* Mobile Menu Icon */}
          <div
            className="text-3xl md:hidden z-40"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </div>
        </div>
      </div>

      {/* ✅ Mobile Navigation Drawer */}
      <ul
        className={`z-20 md:hidden dark:bg-[#020817] bg-white fixed top-0 bottom-0 right-0 overflow-y-auto
          w-64 max-w-[80%] py-10 pl-4 gap-3 duration-500 ease-in-out
          ${open ? "translate-x-0" : "translate-x-full"}
          transition-transform`}
      >
        <li className="pt-5 pb-3">
          <a href="/" className="inline-flex items-center text-lg">
            <span className="mr-2 hover:font-semibold">
              <HiPlus size={28} />
            </span>
            Create
          </a>
        </li>

        <li className="py-3">
          <a
            href="/recommendation"
            className="inline-flex items-center text-lg px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            <span className="mr-2">
              <FaDice size={24} />
            </span>
            Surprise Me
          </a>
        </li>

        {/* ✅ Mobile Dropdown (Accordion) */}
        <li className="py-3">
          <button
            onClick={() => setExploreOpen(!exploreOpen)}
            className="inline-flex items-center text-lg w-full"
          >
            <span className="mr-2 hover:font-semibold">
              <HiCollection size={28} />
            </span>
            Explore
          </button>

          {exploreOpen && (
            <div className="ml-10 mt-2 flex flex-col gap-3">
              <a
                href="/wheels"
                className="flex items-center text-lg hover:underline"
              >
                <GiCartwheel
                  size={22}
                  className="mr-2 text-gray-500 dark:text-gray-300"
                />
                Wheels
              </a>

              <a
                href="/lists"
                className="flex items-center text-lg hover:underline"
              >
                <HiViewList
                  size={22}
                  className="mr-2 text-gray-500 dark:text-gray-300"
                />
                Lists
              </a>
            </div>
          )}
        </li>

        <li>
          <div className="py-3 mr-2">
            <UserInfo
              name={session?.user?.name}
              status={status}
              setOpen={setOpen}
            />
          </div>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
