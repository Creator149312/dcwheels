"use client";
import { useEffect, useState } from "react";
import UserDropDownMenu from "./dropdowns/UserDropDownMenu";
import { Button } from "./ui/button";

export default function UserInfo({ name, status, setOpen }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Keep the first client render identical to SSR output to avoid hydration mismatches.
  if (!isMounted || status === "loading") {
    return (
      <div className="h-10 w-24" aria-hidden="true" />
    );
  }

  if (status === "authenticated") {
    return (
      <div className="cursor-pointer flex flex-col gap-5 align-middle items-center">
        {/* This is where I need to fetch coins from the database to show on user profile */}
        <UserDropDownMenu name={name} setOpen={setOpen} />
      </div>
    );
  } else {
    return (
      <a className="gap-5" href="/login">
        <Button className="cursor-pointer" size={"lg"} variant={"default"}>
          Login
        </Button>
      </a>
    );
  }
}
