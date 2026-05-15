import { getAskById } from "@lib/askStories";
import AskCard from "@components/AskCard";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const ask = await getAskById(params.id);
  if (!ask) return { title: "Dilemma not found" };
  return {
    title: `${ask.question.slice(0, 60)} – Ask Papa`,
    description: `Help ${ask.authorName} decide. Vote on Ask Papa.`,
  };
}

export default async function AskDetailPage({ params }) {
  const ask = await getAskById(params.id);
  if (!ask) notFound();

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="mb-6">
        <Link
          href="/ask"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ask Papa
        </Link>
      </div>

      {/* Render card in non-compact mode: shows full voting UI */}
      <AskCard ask={ask} compact={false} />
    </main>
  );
}
