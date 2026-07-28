/**
 * WheelInfoStatic — Server Component shell for wheel info.
 *
 * Renders only the <h1> title so it arrives in the first HTML flush
 * as the LCP element, before any DB calls or JS execution.
 * Tags, description, and interactive actions are rendered separately
 * below this in the page so their Suspense boundaries don't block the title.
 */
export default function WheelInfoStatic({ wordsList }) {
  return (
    <div className="mt-1 mb-1 sm:mt-3 w-full px-3 text-left">
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-0.5 truncate pr-8 sm:pr-0" title={wordsList.title}>
        {wordsList.title}
      </h1>
    </div>
  );
}
