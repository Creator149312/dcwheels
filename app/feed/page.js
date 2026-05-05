import { getGlobalSpinStories } from "@lib/spinStories";
import { getActiveAsks } from "@lib/askStories";
import GlobalSpinFeed from "@components/GlobalSpinFeed";
import { TbActivity } from "react-icons/tb";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Feed - SpinWheel",
  description: "See what the SpinWheel community is deciding right now in our live activity feed.",
};

export default async function FeedPage() {
  // Fetch spins and a handful of active asks to seed teasers — parallel
  const [stories, asks] = await Promise.all([
    getGlobalSpinStories(50),
    getActiveAsks({ limit: 6 }),
  ]);

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="mb-8 border-b border-gray-200 dark:border-gray-800 pb-6 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold flex items-center justify-center sm:justify-start gap-3 text-gray-900 dark:text-white">
          <TbActivity className="text-blue-500" />
          <span>Live Community Feed</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">
          See what people are spinning and deciding right now across SpinWheel.
        </p>
      </div>

      <GlobalSpinFeed stories={stories} askTeasers={asks} />
    </main>
  );
}
