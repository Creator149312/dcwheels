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

    document.addEventListener("mouseover", handler);

    return () => {
      document.removeEventListener("mouseover", handler);
    };
  });

  return (
    <div className="menu-container" ref={menuRef}>
      <div
        className="menu-trigger"
        onMouseOver={() => {
          setOpen(!open);
        }}
      >
        <div className="display-flex center-align x-large-text">
          <HiOutlineUserCircle />
        </div>
      </div>

      <div className={`p-5 grid shadow-lg ${open ? "block" : "hidden"}`}>
        <ul>
          <li>{props.name}</li>
          <DropdownItem url={"/lists/addList"} text={"New List +"} />
          <DropdownItem url={"/dashboard"} text={"Dashboard"} />
          <DropdownItem url={"/settings"} text={"Settings"} />
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
    <li className="text-lg my-3">
      <a href={props.url}> {props.text} </a>
    </li>
  );
}

export default UserProfileDropDown;
