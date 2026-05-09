'use client'

import { useState } from "react";
import Link from "next/link";
import { links } from "./Mylinks";
import { ChevronUp, ChevronDown } from "lucide-react";

const NavLinks = ({ setOpen }) => {
  const [heading, setHeading] = useState("");
  const [subHeading, setSubHeading] = useState("");
  return (
    <>
      {links.map((link, index) => (
        <div key={index}>
          <div className="px-3 text-left md:cursor-pointer group">
            <h1
              className="py-7 flex justify-between items-center md:pr-0 pr-5 text-lg group"
              onClick={() => {
                heading !== link.name ? setHeading(link.name) : setHeading("");
                setSubHeading("");
              }}
            >
              {link.name}
              <span className="text-xl md:hidden inline">
                {heading === link.name ? <ChevronUp />
                  : <ChevronDown />
                }
              </span>
              <span className="text-xl md:mt-1 md:ml-2 md:block hidden group-hover:rotate-180 group-hover:-mt-2">
                <ChevronDown />
              </span>
            </h1>
            {link.submenu && (
              <div>
                <div className="absolute dark:bg-[#020817] bg-white top-20 hidden group-hover:md:block hover:md:block">
                  {/* <div className="py-3">
                    <div
                      className="w-4 h-4 left-3 absolute 
                    mt-1 bg-white rotate-45"
                    ></div>
                  </div> */}
                  <div className="p-5 grid shadow-lg">
                    {link.sublinks.map((mysublinks, index) => (
                      <div key={`dropdown${index}`}>
                        {/* <h1 className="text-lg font-semibold">
                          {mysublinks.Head}
                        </h1> */}
                        {mysublinks.sublink.map((slink, index) => (
                          <li className="text-lg my-3" key={`sublink${index}`}>
                            <a
                              href={slink.link}
                              className="hover:font-semibold"
                            >
                              {slink.name}
                            </a>
                          </li>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Mobile menus */}
          <div
            className={`
            ${heading === link.name ? "md:hidden" : "hidden"}
            dark:bg-[#020817] bg-white` }
          >
            {/* sublinks */}
            {link.sublinks.map((slinks, index) => (
              <div key={`mb${index}`}>
                <div>
                  <h1
                    onClick={() =>
                      subHeading !== slinks.Head
                        ? setSubHeading(slinks.Head)
                        : setSubHeading("")
                    }
                    className="py-4 pl-7 font-semibold md:pr-0 pr-5 flex justify-between items-center"
                  >
                    {slinks.Head}

                    <span className="text-xl md:mt-1 md:ml-2 inline">
                      {
                        subHeading === slinks.Head
                          ? <ChevronUp />
                          : <ChevronDown />
                      }
                    </span>
                  </h1>
                  <div
                    className={`${subHeading === slinks.Head ? "md:hidden" : "hidden"
                      }`}
                  >
                    {slinks.sublink.map((slink, index) => (
                      <li key={`mbsub${index}`} className="py-3 pl-14 text-lg">
                        <a href={slink.link} >{slink.name}</a>
                      </li>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default NavLinks;