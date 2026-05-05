import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import { connectMongoDB } from "@lib/mongodb";
import User from "@models/user";
import AccountSettingsForm from "./AccountSettingsForm";

// Per-user settings — never cache.
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard/account");
  }

  const isGoogleUser = session.user.authMethod === "google";

  // Load privacy preferences for the form. Read-only here — the form
  // mutates them through PATCH /api/user/settings, not via this page.
  await connectMongoDB();
  const user = await User.findOne({ email: session.user.email })
    .select("publicSpins")
    .lean();

  return (
    <AccountSettingsForm
      email={session.user.email}
      isGoogleUser={isGoogleUser}
      initialPublicSpins={!!user?.publicSpins}
    />
  );
}
