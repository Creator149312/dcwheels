"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { useSession } from "next-auth/react";
import NotificationPanel from "./NotificationPanel";

export default function NotificationBell() {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [cachedNotifications, setCachedNotifications] = useState(null);
  const fetchedInitialRef = useRef(false);

  // Pre-fetch notifications once user scrolls or moves mouse so clicking bell is instant
  useEffect(() => {
    if (!session) return;

    const loadNotifications = () => {
      if (fetchedInitialRef.current) return;
      fetchedInitialRef.current = true;

      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
          }
          if (data.notifications) {
            setCachedNotifications(data);
          }
        })
        .catch((err) => console.error("Error loading notifications:", err));

      window.removeEventListener("scroll", loadNotifications);
      window.removeEventListener("mousemove", loadNotifications);
      window.removeEventListener("touchstart", loadNotifications);
    };

    if (typeof window !== "undefined" && window.scrollY > 0) {
      loadNotifications();
      return;
    }

    window.addEventListener("scroll", loadNotifications, { passive: true });
    window.addEventListener("mousemove", loadNotifications, { passive: true });
    window.addEventListener("touchstart", loadNotifications, { passive: true });

    return () => {
      window.removeEventListener("scroll", loadNotifications);
      window.removeEventListener("mousemove", loadNotifications);
      window.removeEventListener("touchstart", loadNotifications);
    };
  }, [session]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Sync count on tab focus
  useEffect(() => {
    if (!session) return;

    const handleFocus = () => {
      fetch("/api/notifications")
        .then((res) => res.json())
        .then((data) => {
          if (data.unreadCount !== undefined) {
            setUnreadCount(data.unreadCount);
          }
          if (data.notifications) {
            setCachedNotifications(data);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [session]);

  if (!session) return <div className="w-9 h-9" />;

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

      {isOpen && (
        <NotificationPanel
          initialData={cachedNotifications}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
