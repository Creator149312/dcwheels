import { getActiveAsks } from "@lib/askStories";
import AskFeedClient from "./AskFeedClient";
import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ask Papa – Get Crowdsourced Decisions",
  description: "Can't decide? Post your dilemma and let the community help you choose.",
};

export default async function AskPage() {
  const asks = await getActiveAsks({ limit: 20 });

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3 text-foreground">
              <MessageCircleQuestion className="text-primary" />
              <span>Ask Papa</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Real people. Real decisions.
            </p>
          </div>
          <Link
            href="/ask/create"
            className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm px-4 py-2.5 rounded-full shadow transition-colors"
          >
            + Ask a Question
          </Link>
        </div>
      </div>

      <AskFeedClient initialAsks={asks} />
    </main>
  );
}
