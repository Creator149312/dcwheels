import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

export const dynamic = "force-dynamic";

/**
 * /u/me
 * Convenience redirect: sends the logged-in user straight to their
 * canonical profile page. Used as the default post-login destination
 * so /login -> /dashboard -> /u/[username] becomes /login -> /u/me -> /u/[username].
 */
export default async function MePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.username) {
    redirect("/login");
  }

  redirect(`/u/${encodeURIComponent(session.user.username.toLowerCase())}`);
}
