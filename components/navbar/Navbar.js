"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import NavLinks from "./NavLinks";
import ThemeToggle from "../../components/ThemeToggle";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="mr-2 ml-2">
      <div className="flex items-center font-medium justify-between">
        <div className="z-50 p-3 md:w-auto w-full flex justify-between">
          <a href="/" className="text-3xl font-bold flex items-center">
            <img
              src={"/logo192.png"}
              alt="logo"
              className="md:cursor-pointer h-9 pr-2"
            />
            Wordpapa
          </a>
          <div className="flex gap-3">
             <div  className="md:hidden"><ThemeToggle/></div>
            <div className="text-3xl md:hidden" onClick={() => setOpen(!open)}>
              {open ? <X size={35} /> : <Menu size={35} />}
            </div>
          </div>
        </div>
        <ul className="md:flex hidden items-center gap-2">
          <ThemeToggle/>
          <NavLinks />
          <li>
            <Link href="/thesaurus" className="py-7 text-lg px-3 inline-block">
              Thesaurus
            </Link>
          </li>
          {/* <li>
                    <CustomNavigationMenu title={"Word Finders"} itemList={wordFindersComponents}/>
                    </li> */}
        </ul>
        {/* <div className="md:block hidden">
                    <Button> Subscribe</Button>
                </div> */}
        {/* Mobile nav */}
        <ul
          className={`
        md:hidden dark:bg-[#020817] bg-white fixed w-full top-0 overflow-y-auto bottom-0 py-10 pl-4
        duration-500 ${open ? "left-0" : "left-[-100%]"}
        `}
        >
          <NavLinks setOpen={setOpen} />
          {/* 
                    <div className="py-5">
                        <Button />
                    </div> */}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
