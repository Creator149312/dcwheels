import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import AccountSettingsForm from "./AccountSettingsForm";

// Per-user settings — never cache.
export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/dashboard/account");
  }

  const isGoogleUser = session.user.authMethod === "google";

  return (
    <AccountSettingsForm
      email={session.user.email}
      isGoogleUser={isGoogleUser}
    />
  );
}
