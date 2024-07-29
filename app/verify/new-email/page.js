"use client"
import { Suspense } from "react";
import AccountEmailVerification from "@components/AccountEmailVerification";

const page = () => {
  return <Suspense><AccountEmailVerification /></Suspense>;
};

export default page;
