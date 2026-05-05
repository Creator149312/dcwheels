import { getActiveAsks } from "@lib/askStories";
import AskFeedClient from "./AskFeedClient";
import Link from "next/link";
import { TbMessageQuestion } from "react-icons/tb";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ask Papa – Get Crowdsourced Decisions",
  description: "Can't decide? Post your dilemma and let the community help you choose. Earn coins for voting.",
};

export default async function AskPage() {
  const asks = await getActiveAsks({ limit: 20 });

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-gray-900 dark:text-white">
              <TbMessageQuestion className="text-purple-500" />
              <span>Ask Papa</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Real people. Real decisions. Vote and earn coins.
            </p>
          </div>
          <Link
            href="/ask/create"
            className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow transition-colors"
          >
            + Ask a Question
          </Link>
        </div>
      </div>

      <AskFeedClient initialAsks={asks} />
    </main>
  );
}
