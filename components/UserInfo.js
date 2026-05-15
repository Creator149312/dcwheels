"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import UserDropDownMenu from "./dropdowns/UserDropDownMenu";
import { Button } from "./ui/button";


export default function UserInfo({ setOpen }) {
  const [isMounted, setIsMounted] = useState(false);
  const { status, data: session } = useSession();


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
        {/* User profile section for future enhancements */}
        <UserDropDownMenu name={session?.user?.name} setOpen={setOpen} />
      </div>
    );
  } else {
    return (
      <a className="gap-5" href="/login">
        <Button className="cursor-pointer" size={"lg"} variant={"default"}>
          {"Login"}
        </Button>
      </a>
    );
  }
}
