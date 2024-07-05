"use client";
import UserProfileDropdown from "./dropdowns/UserProfileDropDown";
import { Button } from "./ui/button";

export default function UserInfo({ name, status }) {
  if (status === 'authenticated') {
    return (
      <div className="cursor-pointer flex flex-col gap-5 align-middle items-center">
        <UserProfileDropdown name={name} />
      </div>
    );
  } else {
    return <a className="gap-5" href="/login"><Button className="cursor-pointer" size={"lg"} variant={"default"}>Login</Button></a>;
  }
}