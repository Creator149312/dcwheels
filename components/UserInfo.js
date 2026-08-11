"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";


export default function UserInfo() {
  const [isMounted, setIsMounted] = useState(false);
  const { status, data: session } = useSession();


  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Stable placeholder sized identically to both logged-in and logged-out states
  // so the navbar right-actions width never changes after auth resolves.
  const avatarSkeleton = (
    <div className="h-9 w-9 sm:w-10 sm:h-10 rounded-full bg-muted animate-pulse" aria-hidden="true" />
  );

  if (!isMounted || status === "loading") {
    return (
      <div className="hidden sm:flex items-center gap-2">
        {avatarSkeleton}
      </div>
    );
  }

  if (status === "authenticated") {
    const name = session?.user?.name || "User";
    const username = session?.user?.username || name;
    const profileUrl = `/u/${encodeURIComponent(username.toLowerCase())}`;
    
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <Link 
        href={profileUrl} 
        className="flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-sm font-black text-primary border border-primary/20 shadow-sm ring-2 ring-transparent hover:ring-primary/20 transition-all">
          {initials}
        </div>
      </Link>
    );
  } else {
    return (
      <div className="hidden sm:flex items-center gap-2">
        <Link
          href="/login"
          className="px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
        >
          Log In
        </Link>
        <Link href="/register">
          <Button
            className="cursor-pointer font-bold rounded-full px-5"
            size="sm"
            variant="default"
          >
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }
}
