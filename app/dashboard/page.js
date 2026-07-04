import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import UserDashboard from "@components/UserDashboard";
import { buildDashboardData, resolveUserIdFromSession } from "@lib/dashboard";

// Personal data — must be rendered per-request, never cached.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "User Dashboard",
  description:
    "Explore all your wheels and Take actions like Edit, Delete or Create New Wheels",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.name) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // Retire Dashboard: Permanent redirect to the profile page
  const targetUsername = session?.user?.username || session?.user?.name;
  redirect(`/u/${encodeURIComponent(targetUsername.toLowerCase())}`);
}
