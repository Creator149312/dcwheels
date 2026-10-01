"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Settings, LogOut, Moon, Sun, X, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

/**
 * SettingsModal — theme toggle, sign out, and password change drawer.
 * Extracted from ProfileHeader so it can be lazy-loaded: only downloaded when
 * the owner actually opens Settings, not on every profile view.
 */
export default function SettingsModal({ onClose }) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("settings"); // "settings" | "password"

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsSavingPassword] = useState(false);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in">
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
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition p-1"
            aria-label="Close"
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
  );
}
