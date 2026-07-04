"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { 
  Settings, 
  LogOut, 
  Moon, 
  Sun, 
  Lock, 
  ShieldCheck, 
  X, 
  KeyRound, 
  User as UserIcon,
  Check
} from "lucide-react";
import toast from "react-hot-toast";

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
  const { theme, setTheme } = useTheme();

  // Dialog / Modal Visibility States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Settings Mode Sub-states
  const [activeTab, setActiveTab] = useState("settings"); // "settings" | "password"

  // Edit Profile Form States
  const [editName, setEditName] = useState(user.name || "");
  const [editUsername, setEditUsername] = useState(user.username || "");
  const [editBio, setEditBio] = useState(user.bio || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Settings: Privacy & Password States
  const [publicSpins, setPublicSpins] = useState(!!user.publicSpins);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsSavingPassword] = useState(false);

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

  // Manage Privacy toggle (Public vs Private Profile / publicSpins)
  async function handleTogglePrivacy(nextVal) {
    if (savingPrivacy) return;
    setPublicSpins(nextVal);
    setSavingPrivacy(true);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSpins: nextVal }),
      });

      if (!res.ok) {
        setPublicSpins(!nextVal); // Revert on error
        toast.error("Privacy setting update failed.");
      } else {
        toast.success(
          nextVal
            ? "Your spin stories are now visible on public wheels"
            : "Your spin stories are now private"
        );
      }
    } catch {
      setPublicSpins(!nextVal); // Revert on error
      toast.error("Something went wrong");
    } finally {
      setSavingPrivacy(false);
    }
  }

  // Manage Change Password Submit
  async function handleChangePassword(e) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Password change failed.");
      } else {
        toast.success("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setActiveTab("settings");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <div className="w-full">
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
              <button
                onClick={() => {
                  setActiveTab("settings");
                  setIsSettingsModalOpen(true);
                }}
                className="p-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-lg transition flex items-center justify-center"
                aria-label="Settings"
              >
                <Settings size={16} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Edit Profile Modal (Instagram/Threads Style Drawer) ───────────────── */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
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

              {/* Username Handle */}
              <div>
                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5">
                  Username Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">@</span>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                    required
                    maxLength={40}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition font-bold"
                    placeholder="username"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground/80 leading-tight">
                  Your unique profile handle (3-40 chars). Must start and end with a letter or number. Dots, hyphens, and underscores allowed in the middle.
                </p>
              </div>

              {/* Profile Bio */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest">
                    Bio
                  </label>
                  <span className="text-[10px] font-bold text-muted-foreground/70">
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

      {/* ── Settings Drawer / Popover Modal ───────────────────────────────── */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
          <div 
            className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/80">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`text-sm font-black pb-1 border-b-2 transition ${
                    activeTab === "settings" 
                      ? "text-primary border-primary" 
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab("password")}
                  className={`text-sm font-black pb-1 border-b-2 transition ${
                    activeTab === "password" 
                      ? "text-primary border-primary" 
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  Privacy & Password
                </button>
              </div>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground transition p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* TAB 1: General Settings */}
            {activeTab === "settings" && (
              <div className="p-4 space-y-1">
                
                {/* Mode Selector - Light / Dark */}
                <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl text-foreground">
                      {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">Theme Mode</p>
                      <p className="text-xs text-muted-foreground">Toggle between light and dark backgrounds</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="px-3.5 py-1.5 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-lg border border-border"
                  >
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </button>
                </div>

                {/* Profile Privacy Flag Toggle */}
                <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-muted/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-xl text-foreground">
                      {publicSpins ? <Globe size={18} /> : <Lock size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-foreground">Public Spin Stories</p>
                      <p className="text-xs text-muted-foreground">Share your decisions in spin feeds</p>
                    </div>
                  </div>
                  
                  {/* Custom Toggle Switch */}
                  <button
                    onClick={() => handleTogglePrivacy(!publicSpins)}
                    disabled={savingPrivacy}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      publicSpins ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        publicSpins ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Sign Out Action */}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-destructive/10 text-red-600 dark:text-red-500 transition group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-xl">
                      <LogOut size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black">Log Out</p>
                      <p className="text-xs text-red-500/80">Sign out of your active account</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* TAB 2: Private Security (Change Password) */}
            {activeTab === "password" && (
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/80">
                  <KeyRound size={16} className="text-primary" />
                  <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Change Password</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-muted/50 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="flex-1 py-2 px-3 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-lg transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="flex-1 py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-lg transition disabled:opacity-50"
                  >
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}