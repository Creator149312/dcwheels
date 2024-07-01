"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import { Button } from "./ui/button";
import {googleLogo} from "@public/google-logo.png"

export default function SignInBtn() {
  return (
    <Button
      onClick={() => signIn("google")}
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