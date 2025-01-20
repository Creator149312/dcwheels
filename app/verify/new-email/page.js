import { Suspense } from "react";
import AccountEmailVerificationByToken from "@components/AccountEmailVerificationByToken";
import AccountEmailVerification from "@components/AccountEmailVerification";

export const metadata = {
  title: "Email Verification",
  description:
    "Email Verification",
};

const page = () => {
  return <Suspense><AccountEmailVerificationByToken /></Suspense>;
};

export default page;
