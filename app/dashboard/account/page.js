import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

/**
 * /dashboard/account → /u/[username] Redirect
 * Legacy route deprecated in favor of new profile page
 */
export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    redirect("/login?callbackUrl=/dashboard/account");
  }

  const targetUsername = session?.user?.username || session.user.name;
  redirect(`/u/${encodeURIComponent(targetUsername.toLowerCase())}`);
}
