import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import RegisterFormAdv from "@components/RegisterFormAdv";

export const metadata = {
  title: "Register",
  description:
    "Register using a unique username and password to save your custom made wheels",
};

async function Page() {
  const session = await getServerSession(authOptions);

  // Authenticated users shouldn't see the register page; send them home.
  if (session?.user?.username) {
    redirect(`/u/${encodeURIComponent(session.user.username.toLowerCase())}`);
  }

  return (
    <Suspense fallback={null}>
      <RegisterFormAdv />
    </Suspense>
  );
}

export default Page;
