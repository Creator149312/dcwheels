"use client";

import { useState } from "react";
import toast from "react-hot-toast";


// Pure client form. The parent server component handles the auth redirect
// so we can trust `email` + `isGoogleUser` to be present here.
export default function AccountSettingsForm({
  email,
  isGoogleUser,
  initialPublicSpins = false,
}) {

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Privacy: opt-in toggle for public Spin Stories. Default false (matches
  // the server-side default in models/user.js) so users are never
  // surprised by a public profile activity feed they didn't ask for.
  const [publicSpins, setPublicSpins] = useState(!!initialPublicSpins);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  async function handleTogglePublicSpins(next) {
    // Optimistic update — flip the UI immediately, revert on failure.
    setPublicSpins(next);
    setSavingPrivacy(true);
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSpins: next }),
      });
      if (!res.ok) {
        setPublicSpins(!next);
        toast.error("Privacy Update Failed");
      } else {
        toast.success(
          next
            ? "Privacy Public Success"
            : "Privacy Private Success"
        );
      }
    } catch {
      setPublicSpins(!next);
      toast.error("Something Went Wrong");
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Password Mismatch");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password Too Short");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Password Update Failed");
      } else {
        toast.success("Password Updated");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Something Went Wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-foreground mb-1">{"Title"}</h1>

      <div className="mt-2 mb-8 text-sm text-muted-foreground">
        {"Signed In As"} <span className="font-medium text-foreground">{email}</span>
      </div>

      {/* Change Password */}
      <section className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">{"Change Password"}</h2>

        {isGoogleUser ? (
          <p className="text-sm text-muted-foreground">
            {"Google Password Managed"}
          </p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {"Current Password"}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {"New Password"}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {"Confirm New Password"}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-lg border border-border bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? "Updating" : "Update Password"}
            </button>
          </form>
        )}
      </section>

      {/* Privacy — Spin Stories opt-in. Off by default so existing users
          never have saves surface publicly without explicit consent. */}
      <section className="mt-6 bg-card border border-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">
          {"Privacy"}
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {"Show Public Spins"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {"Public Spins Description"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={publicSpins}
            disabled={savingPrivacy}
            onClick={() => handleTogglePublicSpins(!publicSpins)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
              publicSpins
                ? "bg-primary"
                : "bg-muted"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
                publicSpins ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
