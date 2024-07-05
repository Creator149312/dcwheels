"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import NavLinks from "./NavLinks";
import ThemeToggle from "@components/ThemeToggle";
import { useSession } from "next-auth/react";
import UserInfo from "@components/UserInfo";
import SearchBarNav from "@components/SearchNavBar";
import { HiSearch } from "react-icons/hi";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { status, data: session } = useSession();

  // console.log("Data is here \n", session);

  return (
    <nav className="pr-2 pl-2 text-center shadow">
      <div className="flex items-center font-medium justify-between">
        <div className="z-50 p-3 md:w-auto w-full flex justify-between">
          <a href="/" className="text-2xl font-semibold flex items-center">
            <img
              src={"/spin-wheel-logo.png"}
              alt="logo"
              className="md:cursor-pointer h-9 pr-2"
            />
            WheelMaster
          </a>
          <div className="flex gap-4">
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <div className="text-3xl md:hidden" onClick={() => setOpen(!open)}>
              {open ? <X size={35} /> : <Menu size={35} />}
            </div>
          </div>
        </div>
        <ul className="md:flex hidden p-3 justify-between align-middle gap-10 pr-5">
          <ThemeToggle />
          {/* <NavLinks /> */}
          <li>
            <div className="md:flex hidden">
              <UserInfo name={session?.user?.name} status={status} />
            </div>
          </li>
          <li>
            <a
              href="/search"
              className="inline-flex align-middle items-center text-lg"
            >
              <span className="mr-2 hover:font-semibold">
                <HiSearch size={38} />
              </span>
              Find Wheels
            </a>
          </li>
          {/* <li className="items-center">
            <a href="/" className="hover:font-semibold text-lg items-center align-middle">
              Help
            </a>
          </li> */}
        </ul>

        {/* Mobile nav */}
        <ul
          className={`
        md:hidden dark:bg-[#020817] bg-white fixed w-full top-0 overflow-y-auto bottom-0 py-10 pl-4
        duration-500 align-middle ${open ? "left-0" : "left-[-100%]"}
        `}
        >
          {/* <NavLinks setOpen={setOpen} /> */}
          <li>
            <div className="py-5 mr-2">
              <UserInfo name={session?.user?.name} status={status} />
            </div>
          </li>
          <li>
            <a href="/search" class="inline-flex">
              <span className="align-middle mr-2 hover:font-semibold">
                <HiSearch size={28} />
              </span>
              <span>Find Wheels</span>
            </a>
          </li>
          {/* <li>
            <a href="" className="hover:font-semibold">
              Help
            </a>
          </li> */}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
