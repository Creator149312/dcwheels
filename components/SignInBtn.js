"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { Button } from "./ui/button";
import toast from 'react-hot-toast'

export default function SignInBtn() {
  
  const handleGoogleSignIn = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' }); 
    } catch (error) {
      toast.error("Google Sign-in failed");
      // Handle the error, e.g., display an error message to the user
    }
  };

  return (
    <Button
      onClick={handleGoogleSignIn}
      className="m-2 p-2"
      size={"lg"}
      variant={"secondary"}
    >
      <Image src="/google-logo.png" alt="google logo" className="m-2" height={25} width={25} />
      <span className="normal-text">
        Sign in with Google
      </span>
    </Button>
  );
}