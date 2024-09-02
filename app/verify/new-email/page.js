import { Suspense } from "react";
import AccountEmailVerification from "@components/AccountEmailVerification";

export const metadata = {
  title: "Email Verification",
  description:
    "Register using a unique username and password to save your custom made wheels",
};

const page = () => {
  return <Suspense><AccountEmailVerification /></Suspense>;
};

export default page;
