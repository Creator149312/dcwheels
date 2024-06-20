"use client";
import UserProfileDropdown from "./dropdowns/UserProfileDropDown";

export default function UserInfo({name, status}) {
  if (status === 'authenticated') {
    return (
      <div className="shadow-xl p-8 cursor-pointer rounded-md flex flex-col gap-3 bg-yellow-200">
        <div>
           <UserProfileDropdown name={name} /> 
        </div>
      </div>
    );
  } else {
    return <a className="cursor-pointer custom-button" href="/login">Login</a>;
  }
}