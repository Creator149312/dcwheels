import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";

/**
 * /dashboard/lists ? /u/[username] Redirect
 * Legacy route deprecated in favor of new profile page
 */
export default async function DashboardListsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.name) {
    redirect("/login?callbackUrl=/dashboard/lists");
  }

  const targetUsername = session?.user?.username || session.user.name;
  redirect(`/u/${encodeURIComponent(targetUsername.toLowerCase())}`);
}
