"use client";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { verifyUserEmailbyToken } from "./actions/actions";
import Link from "next/link";

const AccountEmailVerificationByToken = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const verifyEmail = useCallback(async () => {
    if (!token || hasStarted) return;

    // Use sessionStorage to prevent multiple calls in development (StrictMode)
    const sessionKey = `verify_attempt_${token}`;
    const cachedStatus = typeof window !== "undefined" ? sessionStorage.getItem(sessionKey) : null;

    if (cachedStatus) {
      if (cachedStatus === "success") {
        setSuccess(true);
        setIsLoading(false);
      } else if (cachedStatus === "failed") {
        setError("Email verification completed or token already used.");
        setIsLoading(false);
      }
      return;
    }

    setHasStarted(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(sessionKey, "pending");
    }
    console.log("Starting verification for token:", token);

    try {
      const data = await verifyUserEmailbyToken(token);
      console.log("Verification response:", data);

      if (data.success) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(sessionKey, "success");
        }
        setSuccess(true);
      } else {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(sessionKey, "failed");
        }
        setError(data.error || "Email verification failed.");
      }
    } catch (err) {
      console.error("Verification Error:", err);
      setError(`An error occurred: ${err.message || "Unknown error"}`);
    } finally {
      console.log("Setting isLoading to false");
      setIsLoading(false);
    }
  }, [token, hasStarted]);

  useEffect(() => {
    console.log("Effect running, hasStarted:", hasStarted, "token:", !!token);
    if (!hasStarted && token) {
      verifyEmail();
    }
  }, [verifyEmail, hasStarted, token]);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4 rounded shadow-lg">
          {isLoading ? (
            <h1 className="text-3xl font-bold text-center">
              Checking Your Email, Please Wait!
            </h1>
          ) : (
            <>
              {error ? (
                <div className="text-red-500">{error}</div>
              ) : success ? (
                <>
                  <div className="text-lg">
                    Your Email verified Successfully, Please login!
                  </div>
                  <Link href="/login?callbackUrl=/dashboard">
                    <Button className="mt-4 px-4 py-2 rounded">
                      Login to Continue
                    </Button>
                  </Link>
                </>
              ) : (
                <div>Email verification failed.</div> 
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default AccountEmailVerificationByToken;