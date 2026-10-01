"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { ShieldCheck, X, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import ProfileMenu from "@components/ProfileMenu";

// The Settings drawer (theme, sign-out, password) is heavy — load on demand.
const SettingsModal = dynamic(() => import("@components/SettingsModal"), { ssr: false });

/**
 * Threads / Instagram style Profile Header Component
 * Encompasses user credentials (name, bio, website link),
 * dynamic Edit Profile Modal, and inline Settings drawer/modal with dark/light mode toggles,
 * privacy preferences, password changes, and sign out options.
 */
export default function ProfileHeader({
  initialUser,
  isOwner,
  joinDate,
  stats,
}) {
  const [user, setUser] = useState(initialUser);
  const { data: session, update: updateSession } = useSession();

  // Dialog / Modal Visibility States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const openSettings = () => setIsSettingsModalOpen(true);

  // Edit Profile Form States
  const [editName, setEditName] = useState(user.name || "");
  const [editUsername, setEditUsername] = useState(user.username || "");
  const [editBio, setEditBio] = useState(user.bio || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Generate initials for avatar avatar
  const initials = (user.name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Manage Edit Profile Submit
  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          username: editUsername.trim().toLowerCase(),
          bio: editBio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Profile settings update failed.");
      } else {
        toast.success("Profile updated successfully!");
        setUser((prev) => ({
          ...prev,
          name: data.settings.name,
          username: data.settings.username,
          bio: data.settings.bio,
        }));
        setIsEditModalOpen(false);

        // If username (handle) changed, redirect automatically to preserve url route
        const oldHandle = initialUser.username || initialUser.name.toLowerCase().replace(/\s+/g, "");
        const newHandle = data.settings.username;

        if (newHandle && newHandle !== initialUser.username) {
          toast.loading("Redirecting to updated profile URL...");
          setTimeout(() => {
            window.location.href = `/u/${encodeURIComponent(newHandle)}`;
          }, 800);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong, please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <div className="w-full px-4 sm:px-0">
      {/* ── Main Threads-style Profile Header Layout ──────────────────────── */}
      <div className="flex flex-col gap-5 pb-6 border-b border-border/80">
        
        {/* Row 1: Name and avatar */}
        <div className="flex items-start justify-between w-full">
          <div className="space-y-1.5 max-w-[75%]">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
              <span>{user.name}</span>
              {user.role === "admin" && (
                <span className="inline-flex text-primary" title="Administrator">
                  <ShieldCheck size={20} fill="currentColor" className="text-primary-foreground stroke-primary" />
                </span>
              )}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground/90">
              {user.username ? `@${user.username}` : (user.email || `@${user.name.toLowerCase().replace(/\s+/g, "")}`)}
            </p>
          </div>
          
          <div className="flex-shrink-0 w-20 h-20 rounded-full bg-gradient-to-tr from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/5 flex items-center justify-center text-2xl font-black text-primary border border-primary/15 shadow-sm">
            {initials}
          </div>
        </div>

        {/* Row 2: Bio & Website description */}
        <div className="space-y-3">
          {user.bio ? (
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line max-w-xl">
              {user.bio}
            </p>
          ) : isOwner ? (
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="text-xs text-muted-foreground hover:text-primary transition underline cursor-pointer"
            >
              + Add a bio to let others know you
            </button>
          ) : null}
        </div>

        {/* Row 4: CTAs & Actions */}
        <div className="flex gap-2.5 w-full mt-4">
          {isOwner ? (
            <>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 py-2 px-4 bg-muted hover:bg-muted/80 text-foreground border border-border text-xs sm:text-sm font-bold rounded-lg transition"
              >
                Edit Profile
              </button>

              {/* ☰ overflow menu — lazily loaded; owns Activity + Settings entry */}
              <ProfileMenu username={user.username} onOpenSettings={openSettings} />
            </>
          ) : null}
        </div>
      </div>

      {/* ── Edit Profile Modal (Instagram/Threads Style Drawer) ───────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
          <div
            className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/80">
              <h2 className="text-lg font-black text-foreground">Edit Profile</h2>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {/* Profile Name */}
              <div>
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    maxLength={50}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                    placeholder="Enter your name"
                  />
                  <UserIcon size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60" />
                </div>
              </div>

              {/* Username Handle — shown for reference but locked for now. */}
              <div>
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                  Username Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">@</span>
                  <input
                    type="text"
                    value={editUsername}
                    readOnly
                    disabled
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-muted/70 text-sm text-muted-foreground font-bold cursor-not-allowed"
                    placeholder="username"
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground/80 leading-tight">
                  Username changes are temporarily disabled.
                </p>
              </div>

              {/* Profile Bio */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Bio
                  </label>
                  <span className="text-xs font-bold text-muted-foreground/70">
                    {editBio.length}/160
                  </span>
                </div>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={160}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none"
                  placeholder="Write a short description..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-muted hover:bg-muted/80 text-foreground font-bold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-sm rounded-xl transition disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving..." : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Settings Drawer (lazy chunk) ──────────────────────────────────── */}
      {isSettingsModalOpen && (
        <SettingsModal onClose={() => setIsSettingsModalOpen(false)} />
      )}
    </div>
  );
}