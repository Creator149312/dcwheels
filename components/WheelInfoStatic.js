import Link from "next/link";
import { GitFork } from "lucide-react";

/**
 * WheelInfoStatic — Server Component shell for wheel info.
 *
 * Renders only the <h1> title so it arrives in the first HTML flush
 * as the LCP element, before any DB calls or JS execution.
 * Tags, description, and interactive actions are rendered separately
 * below this in the page so their Suspense boundaries don't block the title.
 */
export default function WheelInfoStatic({ wordsList }) {
  const forkedWheelId = wordsList?.forkedFrom?.wheelId;
  const forkedAuthor = wordsList?.forkedFrom?.authorHandle;

  return (
    <div className="mt-1 mb-1 sm:mt-3 w-full px-3 text-left">
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-0.5 truncate pr-8 sm:pr-0" title={wordsList.title}>
        {wordsList.title}
      </h1>

      {forkedWheelId && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          <GitFork className="w-3.5 h-3.5 text-primary/70 shrink-0" />
          <span>Remixed from</span>
          <Link
            href={`/wheels/${forkedWheelId}`}
            className="font-medium text-primary hover:underline truncate max-w-[240px]"
          >
            {forkedAuthor ? `@${forkedAuthor}'s wheel` : "original wheel"}
          </Link>
        </div>
      )}
    </div>
  );
}
