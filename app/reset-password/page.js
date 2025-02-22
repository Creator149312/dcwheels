import { Suspense } from "react";
import ResetPasswordForm from "@components/ResetPasswordForm";

export const metadata = {
  title: "Password Reset",
  description:
    "Create new password to regain access your account",
};

const Page = () => {
  return <Suspense><ResetPasswordForm /></Suspense>;
};

export default Page;