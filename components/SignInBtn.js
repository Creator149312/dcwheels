"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { Button } from "./ui/button";
import toast from "react-hot-toast";

export default function SignInBtn({ callbackUrl = "/dashboard", fullWidth = false }) {
  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl });
    } catch (error) {
      toast.error("Google Sign-in failed");
    }
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      type="button"
      variant="outline"
      size="lg"
      className={`${
        fullWidth ? "w-full" : "m-2"
      } h-11 gap-2 font-medium border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800`}
    >
      <Image
        src="/google-logo.png"
        alt=""
        height={20}
        width={20}
        aria-hidden="true"
      />
      <span>Continue with Google</span>
    </Button>
  );
}