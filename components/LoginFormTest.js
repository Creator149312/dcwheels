"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

import SignInBtn from "@components/SignInBtn";
import Notification from "@components/Notification";
import { validateEmail, validatePasswordLength } from "@utils/Validator";
import { Button } from "./ui/button";

export default function LoginForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSigning, setIsSigning] = useState(false);

  const router = useRouter();

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
    if (ve) err.email = ve;
    if (vp) err.password = vp;
    return err;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
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

      if (res.error) {
        setError("Invalid Credentials");
        return;
      }

      // Success
      if (onSuccess) {
        onSuccess();
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError("Login failed");
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm mx-auto p-6 space-y-6 sm:px-8 sm:py-10"
    >
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.email}
          onChange={handleChange}
          required
        />
        {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          className="w-full px-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={formData.password}
          onChange={handleChange}
          required
        />
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password}</p>
        )}

        <div className="text-right">
          <a
            href="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot password?
          </a>
        </div>
      </div>

      <div>
        <Button
          size="lg"
          variant="default"
          className={`w-full py-3 text-base font-semibold ${
            isSigning ? "cursor-not-allowed opacity-50" : ""
          }`}
          disabled={isSigning}
        >
          {isSigning ? "Logging in..." : "Login"}
        </Button>
      </div>

      {isSigning && (
        <p className="text-center text-sm text-gray-500">
          Checking your credentials…
        </p>
      )}
      {error && (
        <Notification
          message={"Username or password is incorrect…"}
          state={"failed"}
        />
      )}

      <div className="text-center">
        <a href="/register" className="text-sm text-gray-700">
          Don’t have an account?{" "}
          <span className="text-blue-600 underline">Register</span>
        </a>
      </div>

      <div className="flex justify-center">
        <SignInBtn />
      </div>
    </form>
  );
}
