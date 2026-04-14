import { getServerSession } from "next-auth";
import { authOptions } from "@app/api/auth/[...nextauth]/route";
import HelpMeDecideFeed from "@components/qna/HelpMeDecideFeed";

export const metadata = {
  title: "Help Me Decide",
  description:
    "Community dilemmas from wheels. Vote and see what the crowd would choose.",
};

export default async function HelpMeDecidePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Help Me Decide</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Browse VS-style community dilemmas from wheels, vote on options, or spin the Community Wheel to see the crowd-leaning choice.
        </p>
      </header>

      <HelpMeDecideFeed isLoggedIn={!!session} />
    </main>
  );
}
