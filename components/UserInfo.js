"use client";
import UserProfileDropdown from "./dropdowns/UserProfileDropDown";

export default function UserInfo({ name, status }) {
  if (status === 'authenticated') {
    return (
      <div className="shadow-xl cursor-pointer rounded-md flex flex-col gap-3">
        <UserProfileDropdown name={name} />
      </div>
    );
  } else {
    return <a className="cursor-pointer custom-button" href="/login">Login</a>;
  }
}