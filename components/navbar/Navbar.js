"use client";

import { useContext, useState } from "react";
import { Menu, X } from "lucide-react";
import ThemeToggle from "@components/ThemeToggle";
import { useSession } from "next-auth/react";
import UserInfo from "@components/UserInfo";
import { HiSearch } from "react-icons/hi";
import { useRouter, usePathname } from "next/navigation";
import CoinComponent from "./CoinComponent";
import { fetchCoinsFromStorage } from "@utils/HelperFunctions";
import { SegmentsContext } from "@app/SegmentsContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { coins, setCoins } = useContext(SegmentsContext);
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
    <div className="pr-2 pl-2 text-center bg-card text-card-foreground shadow">
      <div className="flex items-center font-medium justify-between">
        <div className="z-30 p-2 md:w-auto w-full flex justify-between">
          <a href="/" className="text-2xl font-semibold flex items-center">
            <img
              src={"/spin-wheel-logo.png"}
              alt="logo"
              className="md:cursor-pointer h-9 pr-2"
            />
            SpinPapa
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
        <ul className="z-10 md:flex hidden p-2 justify-between align-middle gap-10 pr-5">
          <li>
            <a
              href="/"
              className="inline-flex align-middle items-center text-lg"
              onClick={handleNewWheelClick}
            >
              New Wheel +
            </a>
          </li>
          <li>
            <a
              href="/wheels"
              className="inline-flex align-middle items-center text-lg"
            >
              All Wheels
            </a>
          </li>
          <ThemeToggle />
          {/* <CoinComponent coins={coins} /> */}
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
          className={`z-20
        md:hidden dark:bg-[#020817] bg-white fixed w-full top-0 overflow-y-auto bottom-0 py-10 pl-4
        duration-500 align-middle ${open ? "left-0" : "left-[-100%]"}
        `}
        >
          {/* <NavLinks setOpen={setOpen} /> */}
          <li>
            <a
              href="/"
              className="inline-flex align-middle items-center text-lg"
            >
              New Wheel +
            </a>
          </li>
          <li>
            <a
              href="/wheels"
              className="inline-flex align-middle items-center text-lg"
            >
              All Wheels
            </a>
          </li>
          <li>
            <div className="py-5 mr-2">
              <UserInfo
                name={session?.user?.name}
                status={status}
                setOpen={setOpen}
              />
            </div>
          </li>
          <li>
            <a href="/search" className="inline-flex">
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
    </div>
  );
};

export default Navbar;
