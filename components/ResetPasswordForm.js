"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { validatePassword } from "@utils/Validator";
import { updateNewPasswordbyToken } from "@components/actions/actions";
import toast from "react-hot-toast";
import { Button } from "./ui/button";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    newPassword: "",
    retypeNewPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setError("");

    const fieldErrors = {};
    const vnp = validatePassword(formData.newPassword);
    if (vnp.length !== 0) fieldErrors.newPassword = vnp;
    if (!formData.retypeNewPassword) {
      fieldErrors.retypeNewPassword = "Please confirm your password";
    } else if (formData.newPassword !== formData.retypeNewPassword) {
      fieldErrors.retypeNewPassword = "Passwords do not match";
    }

    if (Object.keys(fieldErrors).length !== 0) {
      setErrors(fieldErrors);
      return;
    }

    if (!token) {
      setError("Reset link is missing or invalid. Please request a new one.");
      return;
    }

    setIsSubmitting(true);
    try {
      const results = await updateNewPasswordbyToken(formData, token);
      if (results?.error) {
        setError(results.error);
        toast.error(results.error);
      } else {
        toast.success("Password updated. Please sign in.");
        setFormData({ newPassword: "", retypeNewPassword: "" });
        router.push("/login");
      }
    } catch (err) {
      setError("Password reset failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20 mb-3">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Set a new password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Choose a strong password you haven&apos;t used before.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl shadow-gray-900/5 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* New password */}
            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                New password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.newPassword
                      ? "border-red-300 dark:border-red-800"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.newPassword}
                </p>
              )}
            </div>

            {/* Retype */}
            <div>
              <label
                htmlFor="retypeNewPassword"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Confirm new password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  id="retypeNewPassword"
                  name="retypeNewPassword"
                  value={formData.retypeNewPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className={`w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    errors.retypeNewPassword
                      ? "border-red-300 dark:border-red-800"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                />
              </div>
              {errors.retypeNewPassword && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  {errors.retypeNewPassword}
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60">
                <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 text-sm font-semibold"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Updating password…
                </span>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
