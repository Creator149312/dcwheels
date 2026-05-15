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
    <div className="mt-4 sm:mt-6 w-full px-4 text-left">
      <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-0.5">
        {wordsList.title}
      </h1>
    </div>
  );
}
