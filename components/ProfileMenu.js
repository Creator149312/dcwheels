"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Menu, Settings, Activity as ActivityIcon } from "lucide-react";

// Activity modal (timeline renderer + fetch) downloads only when clicked.
const ActivityModal = dynamic(() => import("@components/ActivityModal"), { ssr: false });

/**
 * ProfileMenu — the ☰ overflow button next to "Edit Profile".
 * The button and dropdown are tiny, so this loads normally; only the Activity
 * modal chunk is deferred until the user clicks it.
 */
export default function ProfileMenu({ username, onOpenSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen]);

  const openSettings = () => {
    setMenuOpen(false);
    onOpenSettings?.();
  };

  const openActivity = () => {
    setMenuOpen(false);
    setIsActivityOpen(true);
  };

  return (
    <>
      {/* ☰ overflow menu — Activity + Settings */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition flex items-center justify-center"
          aria-label="More options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <Menu size={16} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={openActivity}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-left text-foreground hover:bg-muted transition"
            >
              <ActivityIcon size={16} className="text-muted-foreground" />
              Activity
            </button>
            <button
              onClick={openSettings}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-left text-foreground hover:bg-muted transition"
            >
              <Settings size={16} className="text-muted-foreground" />
              Settings
            </button>
          </div>
        )}
      </div>

      {/* Activity modal (spin history) — lazy chunk, mounts on click */}
      {isActivityOpen && (
        <ActivityModal username={username} onClose={() => setIsActivityOpen(false)} />
      )}
    </>
  );
}
