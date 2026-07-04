"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import SignInBtn from "@components/SignInBtn";
import { validateEmail, validatePasswordLength } from "@utils/Validator";
import { Button } from "./ui/button";

/**
 * Unified Login Form Component.
 * Used in both standalone login pages and modal prompts.
 */
export default function LoginForm({ onSuccess, onCancel, embedded = false }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl") || "/dashboard";

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  const validateForm = (data) => {
    const err = {};
    const ve = validateEmail(data.email);
    const vp = validatePasswordLength(data.password);
    if (ve && ve.length !== 0) err.email = ve;
    if (vp && vp.length !== 0) err.password = vp;
    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length !== 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSigning(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.replace(callbackUrl);
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSigning(false);
    }
  };

  const formContent = (
    <div className={embedded ? "w-full" : "w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm"}>
       {/* Google */}
       <SignInBtn callbackUrl={callbackUrl} fullWidth />

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase tracking-wider">
          <span className="bg-card px-3 text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={`w-full pl-10 pr-3 py-2.5 text-sm rounded-lg border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                errors.email
                  ? "border-red-300 dark:border-red-800"
                  : "border-border"
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            {!embedded && (
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                errors.password
                  ? "border-red-300 dark:border-red-800"
                  : "border-border"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
              {errors.password}
            </p>
          )}
        </div>

        {/* Server error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-600 dark:text-red-400">
            <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSigning}
          className="w-full h-11 rounded-xl text-sm font-semibold transition-all active:scale-[0.98]"
        >
          {isSigning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground"
          >
            Cancel
          </Button>
        )}
      </form>
    </div>
  );

  if (embedded) return formContent;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="text-center mb-6 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3">
            <span className="text-primary-foreground font-bold text-xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to spin, save, and share your wheels.
          </p>
        </div>
        
        {formContent}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}