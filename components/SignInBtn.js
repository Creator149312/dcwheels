"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function SignInBtn() {
  return (
    <button
      onClick={() => signIn("google")}
      className="m-2 p-2 custom-button"
    >
      <Image src="/google-logo.png" alt="google logo" height={25} width={25} />
      <span className="normal-text">
        Sign in with Google
      </span>
    </button>
  );
}