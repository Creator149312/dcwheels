"use client";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useState, useEffect } from "react";
import { Button } from "./ui/button";
import { verifyUserEmailbyToken } from "./actions/actions";
import Link from "next/link";

const AccountEmailVerification = () => {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const onSubmit = useCallback(() => {
    if (success || error) {
      return;
    }

    if (!token) {
      setError("No token provided");
      return;
    }

    verifyUserEmailbyToken(token)
      .then((data) => {
        if (data.success) {
          setSuccess(data.success);
        }
        if (data.error) {
          setError(data.error);
        }
      })
      .catch((error) => {
        setError("An unexpected error occurred");
      });
  }, [token, success, error]);

  useEffect(() => {
    onSubmit();
  }, []);

  return (
    <>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4 rounded shadow-lg">
          <h1 className="text-3xl font-bold text-center">
            Checking Your Email, Please Wait!
          </h1>
          {error && <div className="text-red-500">{error}</div>}
          {success && (
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
          )}
        </div>
      </div>
    </>
  );
};

export default AccountEmailVerification;
