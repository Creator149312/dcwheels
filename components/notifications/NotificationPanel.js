"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Heart, MessageSquare, Reply, UserPlus, Bell } from "lucide-react";
import { timeAgo } from "@utils/HelperFunctions";

const ICONS = {
  LIKE: <Heart size={16} className="text-red-500 fill-red-500" />,
  COMMENT: <MessageSquare size={16} className="text-blue-500" />,
  REPLY: <Reply size={16} className="text-green-500" />,
  FOLLOW: <UserPlus size={16} className="text-purple-500" />,
  SYSTEM: <Bell size={16} className="text-amber-500" />,
};

export default function NotificationDropdown({ onClose }) {
  const [data, setData] = useState({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  // Fetch notifications fully only when opened
  useEffect(() => {
    let mounted = true;
    fetch("/api/notifications")
      .then((res) => res.json())
      .then((json) => {
        if (mounted && json.notifications) {
          setData(json);
        }
      })
      .catch((err) => console.error("Error fetching notifications", err))
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => (mounted = false);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read", { method: "PATCH" });
      setData((prev) => ({
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const markOneAsRead = async (id, link) => {
    const isUnread = data.notifications.find((n) => n._id === id && !n.isRead);
    if (isUnread) {
      setData((prev) => ({
        unreadCount: Math.max(0, prev.unreadCount - 1),
        notifications: prev.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
      }));
      fetch("/api/notifications/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      }).catch(console.error);
    }
    onClose();
  };

  return (
    <div
      ref={panelRef}
      className="absolute top-10 right-0 w-80 sm:w-96 bg-popover border border-border shadow-xl rounded-xl flex flex-col z-[100] max-h-[80vh] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-card">
        <h3 className="font-bold text-foreground flex items-center gap-2">
          Notifications
          {data.unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-[10px] w-5 h-5 flex items-center justify-center rounded-full">
              {data.unreadCount}
            </span>
          )}
        </h3>
        {data.unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <Check size={14} />
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-[300px]">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            Loading updates...
          </div>
        ) : data.notifications.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Bell size={32} className="opacity-20" />
            <p className="text-sm font-medium">No notifications yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.notifications.map((notif) => (
              <Link
                key={notif._id}
                href={notif.link}
                onClick={() => markOneAsRead(notif._id, notif.link)}
                className={`flex gap-3 p-4 transition-colors hover:bg-muted ${
                  !notif.isRead ? "bg-primary/5 border-l-2 border-primary" : "bg-card"
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0 mt-0.5">
                  {notif.sender?.avatar ? (
                    <img
                      src={notif.sender.avatar}
                      alt={notif.sender.name || "User"}
                      className="w-10 h-10 rounded-full object-cover bg-muted"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {notif.sender?.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                  )}
                  {/* Small Action Icon Badge */}
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 shadow-sm border border-border">
                    {ICONS[notif.type] || ICONS.SYSTEM}
                  </div>
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-snug break-words">
                    {notif.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium mt-1">
                    {timeAgo(notif.createdAt)}
                  </p>
                </div>
                
                {/* Unread indicator dot */}
                {!notif.isRead && (
                  <div className="shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
