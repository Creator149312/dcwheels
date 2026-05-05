"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useLocale } from "@components/providers/LocaleProvider";

// Pure client form. The parent server component handles the auth redirect
// so we can trust `email` + `isGoogleUser` to be present here.
export default function AccountSettingsForm({
  email,
  isGoogleUser,
  initialPublicSpins = false,
}) {
  const { t } = useLocale();
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
        toast.error(t("account.privacyUpdateFailed"));
      } else {
        toast.success(
          next
            ? t("account.privacyPublicSuccess")
            : t("account.privacyPrivateSuccess")
        );
      }
    } catch {
      setPublicSpins(!next);
      toast.error(t("account.somethingWentWrong"));
    } finally {
      setSavingPrivacy(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t("account.passwordMismatch"));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t("account.passwordTooShort"));
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
        toast.error(data.error || t("account.passwordUpdateFailed"));
      } else {
        toast.success(t("account.passwordUpdated"));
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error(t("account.somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t("account.title")}</h1>

      <div className="mt-2 mb-8 text-sm text-gray-500 dark:text-gray-400">
        {t("account.signedInAs")} <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>
      </div>

      {/* Change Password */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t("account.changePassword")}</h2>

        {isGoogleUser ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("account.googlePasswordManaged")}
          </p>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("account.currentPassword")}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("account.newPassword")}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("account.confirmNewPassword")}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {loading ? t("account.updating") : t("account.updatePassword")}
            </button>
          </form>
        )}
      </section>

      {/* Privacy — Spin Stories opt-in. Off by default so existing users
          never have saves surface publicly without explicit consent. */}
      <section className="mt-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {t("account.privacy")}
        </h2>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t("account.showPublicSpins")}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("account.publicSpinsDescription")}
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
                ? "bg-blue-600"
                : "bg-gray-300 dark:bg-gray-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                publicSpins ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
