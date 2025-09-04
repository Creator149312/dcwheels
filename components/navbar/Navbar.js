"use client";

import { useContext, useState } from "react";
import { Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";
import UserInfo from "@components/UserInfo";
import { HiCollection, HiOutlinePlusSm, HiPlus } from "react-icons/hi";
import { useRouter, usePathname } from "next/navigation";
import MobileSearchBar from "@components/MobileSearchBar";
import CategoryMenu from "@components/CategoryMenu";
import { FaBars } from "@node_modules/react-icons/fa";
import { BiSidebar } from 'react-icons/bi';

const Navbar = ({ onToggleSidebar }) => {
  const [open, setOpen] = useState(false);
  const { status, data: session } = useSession();
  const router = useRouter();
  const currentPath = usePathname();

  const handleNewWheelClick = (event) => {
    event.preventDefault();
    // Clear the localStorage
    localStorage.removeItem("SpinpapaWheel");
    // Redirect to the homepage
    if (currentPath === "/") {
      window.location.reload();
    } else router.push("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-gray-950 shadow">
        {/* Hamburger on the far left */}

        <div className="flex items-center justify-between py-2">
          {/* Left: Logo */}{" "}
          <div className="w-16 flex justify-center items-center">
            <button
              onClick={onToggleSidebar}
              className="text-gray-700 dark:text-gray-200 hover:text-black dark:hover:text-white"
            >
              <BiSidebar size={26} />
            </button>
          </div>
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
          {/* Center: Search Bar - hidden on very small mobile */}
          <div className="hidden md:flex flex-grow justify-center px-4">
            <div className="w-full max-w-xl">
              <MobileSearchBar />
            </div>
          </div>
          {/* Right Side */}
          <div className="flex items-center sm:gap-4">
            {/* Search bar toggle + Theme toggle on mobile */}
            <div className="md:hidden">
              <MobileSearchBar />
            </div>
            <div className="md:hidden">{/* <ThemeToggle /> */}</div>
            {/* <CategoryMenu /> 
            * We can uncomment this CategoryMenu if required*/}
            {/* Desktop menu */}
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
                <a href="/wheels" className="inline-flex items-center text-lg">
                  <span className="mr-2 hover:font-semibold">
                    <HiCollection size={26} />
                  </span>
                  All Wheels
                </a>
              </li>
              {/* <ThemeToggle /> */}
              <li>
                <UserInfo name={session?.user?.name} status={status} />
              </li>
            </ul>

            {/* Mobile menu icon */}
            <div
              className="text-3xl md:hidden z-40"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={28} /> : <Menu size={28} />}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <ul
          className={`z-20
      md:hidden dark:bg-[#020817] bg-white fixed top-0 bottom-0 right-0 overflow-y-auto
      w-64 max-w-[80%] py-10 pl-4 gap-3 duration-500 ease-in-out
      ${open ? "translate-x-0" : "translate-x-full"}
      transition-transform
    `}
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
            <a href="/wheels" className="inline-flex items-center text-lg">
              <span className="mr-2 hover:font-semibold">
                <HiCollection size={28} />
              </span>
              All Wheels
            </a>
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
      {/* Navbar content */}
    </nav>
  );
};

export default Navbar;
