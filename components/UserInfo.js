"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "./ui/button";

const AUTH_STORAGE_KEY = "sp_auth_hint";

export default function UserInfo() {
  const [isMounted, setIsMounted] = useState(false);
  const [cachedUser, setCachedUser] = useState(null);
  const { status, data: session } = useSession();

  // Read local auth cache immediately on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setCachedUser(JSON.parse(stored));
      }
    } catch {
      // LocalStorage access restricted or unavailable
    }
  }, []);

  // Sync cache whenever auth status settles
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      try {
        const payload = {
          name: session.user.name || "User",
          username: session.user.username || session.user.name || "User",
        };
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
        setCachedUser(payload);
      } catch {
        // Ignore quota/access errors
      }
    } else if (status === "unauthenticated") {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setCachedUser(null);
      } catch {
        // Ignore
      }
    }
  }, [status, session]);

  // While waiting for hydration: render nothing or null
  if (!isMounted) {
    return null;
  }

  // 1. Authenticated state: either confirmed by NextAuth or predicted via cache
  if (status === "authenticated" || (status === "loading" && cachedUser)) {
    const activeUser = session?.user || cachedUser;
    const name = activeUser?.name || "User";
    const username = activeUser?.username || name;
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
  }

  // 2. Unauthenticated state: confirmed by NextAuth or known to be unauthenticated (no cache)
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
