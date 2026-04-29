import { Suspense } from "react";
import RegisterFormAdv from "@components/RegisterFormAdv";

export const metadata = {
  title: "Register",
  description:
    "Register using a unique username and password to save your custom made wheels",
};

function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterFormAdv />
    </Suspense>
  );
}

export default Page;
