"use client";

import { useState, useEffect, useRef } from "react";
import { HiOutlineUserCircle } from "react-icons/hi";

import SignOut from "@components/user/SignOut"

function UserProfileDropDown(props) {
  const [open, setOpen] = useState(false);

  let menuRef = useRef();

  useEffect(() => {
    let handler = (e) => {
      if (!menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handler);

    return () => {
      document.removeEventListener("click", handler);
    };
  });

  return (
    <div className="flex gap-5 center-align" ref={menuRef}>
      <div
        className="menu-trigger"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <div className="flex center-align">
          <HiOutlineUserCircle size={38}/>
        </div>
      </div>

      <div className={`top-12 px-5 absolute bg-white border-2 shadow-lg flex ${open ? "block" : "hidden"}`}>
        <ul>
          <li className="my-4">{props.name}</li>
          <DropdownItem url={"/dashboard"} text={"Dashboard"} />
          {/* <DropdownItem url={"/settings"} text={"Settings"} /> */}
          <li className="dropdownItem">
            <SignOut />
          </li>
        </ul>
      </div>
    </div>
  );
}

function DropdownItem(props) {
  return (
    <li className="my-4">
      <a href={props.url}> {props.text} </a>
    </li>
  );
}

export default UserProfileDropDown;
