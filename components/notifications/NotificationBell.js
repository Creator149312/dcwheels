"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";

// Don't import the heavy panel until the user clicks the Bell
const NotificationPanel = dynamic(() => import("./NotificationPanel"), {
  ssr: false,
});

export default function NotificationBell() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const fetchedInitialRef = useRef(false);

  // 1. Defer fetching the unread count until the user scrolls or interacts.
  // This saves the database call on initial page load / LCP calculation.
  useEffect(() => {
    if (!session) return;

    const handleInteraction = () => {
      if (fetchedInitialRef.current) return;
      fetchedInitialRef.current = true;
      setIsInteractive(true);

      // Fetch the unread count immediately once they interact
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch((err) => console.error("Error checking notifications:", err));

      // Clean up listeners
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("visibilitychange", handleInteraction);
    };

    // If already interacted or scrolled, fire immediately
    if (typeof window !== 'undefined' && (window.scrollY > 0 || fetchedInitialRef.current)) {
      handleInteraction();
      return;
    }

    window.addEventListener("scroll", handleInteraction, { passive: true });
    window.addEventListener("mousemove", handleInteraction, { passive: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction, { passive: true });
    document.addEventListener("visibilitychange", handleInteraction, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      document.removeEventListener("visibilitychange", handleInteraction);
    };
  }, [session]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
    // If they click the bell before scrolling, force interactive load
    if (!isInteractive) setIsInteractive(true);
  }, [isInteractive]);

  // 2. OPTIMIZATION: Tab-Focus Syncing
  // Re-check count when user switches back to this tab
  useEffect(() => {
    if (!session) return;

    const handleFocus = () => {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [session]);

  // If there's no session, don't show the bell
  // (Or you could show a static bell that triggers a login prompt)
  if (!session) return <div className="w-9 h-9" />; // Placeholder to prevent layout shift

  return (
    <div className="relative inline-flex items-center justify-center min-w-[36px] min-h-[36px]">
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse border-2 border-background box-content" />
        )}
      </button>

      {isOpen && isInteractive && (
        <NotificationPanel onClose={() => setIsOpen(false)} />
      )}
    </div>
  );
}
