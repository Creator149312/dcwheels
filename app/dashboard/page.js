import { getServerSession } from "next-auth";
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
  // SSR-prefetch the dashboard payload so the client doesn't need a
  // JS -> useSession -> fetch waterfall before showing real data.
  // If the user isn't logged in we fall back to client-only rendering,
  // which renders the "log in" CTA in UserDashboard.
  let initialData = null;
  try {
    const session = await getServerSession(authOptions);
    const userId = await resolveUserIdFromSession(session);
    if (userId && session?.user?.email) {
      initialData = await buildDashboardData({
        userId,
        email: session.user.email,
      });
    }
  } catch (err) {
    console.error("Dashboard SSR prefetch failed:", err);
  }

  return <UserDashboard initialData={initialData} />;
}
