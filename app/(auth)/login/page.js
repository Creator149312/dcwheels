import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import LoginForm from "@components/LoginForm";

export const metadata = {
  title: "Login",
  description:
    "Login using your spinpapa credentials to see your saved wheels and take actions",
};

async function Page() {
  const session = await getServerSession(authOptions);

  // Already authenticated users don't need to see the login page again.
  // Send them straight to their profile.
  if (session?.user?.username) {
    redirect(`/u/${encodeURIComponent(session.user.username.toLowerCase())}`);
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

export default Page;
