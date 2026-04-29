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
  // Server-side guard: guests get bounced to /login with a callback so they
  // land back on the dashboard after authenticating. Avoids the client-only
  // "Log in" CTA flash and the wasted JS load for unauthenticated users.
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard");
  }

  // SSR-prefetch the dashboard payload so the client doesn't need a
  // JS -> useSession -> fetch waterfall before showing real data.
  let initialData = null;
  try {
    const userId = await resolveUserIdFromSession(session);
    if (userId) {
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
