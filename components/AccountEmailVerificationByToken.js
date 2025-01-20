"use client";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { verifyUserEmailbyToken } from "./actions/actions";
import Link from "next/link";

const AccountEmailVerificationByToken = () => {
  const [isLoading, setIsLoading] = useState(true); // Track loading state
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const verifyEmail = useCallback(async () => {
    try {
      if (!token) {
        setError("No token provided");
        setIsLoading(false);
        return;
      }

      const data = await verifyUserEmailbyToken(token);

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Email verification failed.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false); 
    }
  }, [token]);

  useEffect(() => {
    verifyEmail();
  }, [verifyEmail]); // Only re-run effect if verifyEmail changes

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
                  <Link href="/login">
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