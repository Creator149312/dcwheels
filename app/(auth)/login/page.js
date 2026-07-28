import { Suspense } from "react";
import LoginForm from "@components/LoginForm";

export const metadata = {
  title: "Login",
  description:
    "Login using your spinpapa credentials to see your saved wheels and take actions",
};

function Page() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

export default Page;
