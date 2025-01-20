"use client";
import UserDropDownMenu from "./dropdowns/UserDropDownMenu";
import { Button } from "./ui/button";

export default function UserInfo({ name, status, setOpen}) {
  if (status === 'authenticated') {
    return (
      <div className="cursor-pointer flex flex-col gap-5 align-middle items-center">
        {/* <UserProfileDropdown name={name} setOpen={setOpen}/> */}
        <UserDropDownMenu name={name} setOpen={setOpen}/>
      </div>
    );
  } else {
    return <a className="gap-5" href="/login"><Button className="cursor-pointer" size={"lg"} variant={"default"}>Login</Button></a>;
  }
}