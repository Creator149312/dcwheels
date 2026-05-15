"use client";

import Image from "next/image";

// Consistent section header: blue accent bar + title + optional action.
function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-blue-600 inline-block" aria-hidden="true" />
        {title}
      </h2>
      {action}
    </div>
  );
}


// Compare CTA: links to /vs with item A pre-filled from the current page (Task 4)
function getCompareHref(type, title, coverUrl, slug) {
  const e = encodeURIComponent;
  const params = new URLSearchParams({ type, a: title });
  if (coverUrl) params.set("aPoster", coverUrl);
  if (slug)     params.set("aSlug", slug);
  return `/vs?${params.toString()}`;
}

// Section order:
//   1. Anime Characters   — visual hook first (anime only)
//   2. Picker Wheels      — SpinPapa's core feature; hidden when empty
//
// Community Votes (QuestionsPanel) and Quick Takes (ReviewsPanel) are
// intentionally not rendered yet — the panels exist but the surrounding
// UX is still being designed. When ready, re-add the imports + sections;
// don't ship dead JSX in the meantime.
export default function TopicInteractionTabs({
  type,
  pageId,
  contentId,
  contentSlug,
  contentTitle = "",
  contentCover = null,
  contentTags = [],
  taggedWheels = [],
  animeCharacters = [],
}) {
  return (
    <div className="space-y-12">

      {/* ── 1. Anime Characters ──────────────────────────────────────────
           Visual hook — portraits draw users in before they hit text-heavy
           sections. Only rendered for anime with character data.           */}
      {type === "anime" && animeCharacters.length > 0 && (
        <section>
          <SectionHeader title="👥 Characters" />
          <div
            className="flex overflow-x-auto gap-3 pb-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {animeCharacters.map((character) => (
              <a
                key={character.id}
                href={`/character/${character.id}-${character.name.full
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                  .replace(/[^\w-]/g, "")}`}
                className="group flex-shrink-0 flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="relative w-24 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <Image
                    src={character.image.large}
                    alt={character.name.full}
                    fill
                    sizes="96px"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <p className="text-xs font-medium text-center text-gray-700 dark:text-gray-300 line-clamp-2 w-24 group-hover:text-blue-600 transition-colors">
                  {character.name.full}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── 2. Picker Wheels ──────────────────────────────────────────────
           SpinPapa's core feature. Hidden when empty → replaced by a compact
           CTA so users can create the first wheel for this content item.    */}
      <section>
        <SectionHeader
          title={`🎡 Picker Wheels${taggedWheels.length > 0 ? ` (${taggedWheels.length})` : ""}`}
        
        />

        {taggedWheels.length === 0 ? (
          /* Task 7: "Create a wheel" CTA when no wheels exist */
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
            <span className="text-2xl">🎡</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                No wheels for this {type} yet.
              </p>
              {contentTitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Be the first to create a spin wheel for {contentTitle}!
                </p>
              )}
            </div>
            {contentId && (
              <a
                href={`/?type=${type}&id=${contentId}`}
                className="flex-shrink-0 px-3 py-1.5 bg-blue-600 hover:bg-blue-700
                           text-white text-xs font-bold rounded-full transition-colors"
              >
                Create Wheel
              </a>
            )}
          </div>
        ) : (
          <div
            className="flex overflow-x-auto gap-4 pb-2 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {taggedWheels.map((wheel) => (
              <a
                key={wheel._id}
                href={`/uwheels/${wheel._id}`}
                className="group w-52 flex-shrink-0 block bg-gray-50 dark:bg-gray-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl overflow-hidden transition-colors"
              >
                <div className="relative w-full aspect-square bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  {wheel.wheelPreview ? (
                    <Image
                      src={wheel.wheelPreview}
                      alt={wheel.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 208px"
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-3xl mb-1">🎡</span>
                      <span className="text-xs text-gray-400 font-medium">No preview</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold truncate mb-1 group-hover:text-blue-600 transition-colors">
                    {wheel.title}
                  </h3>
                  {wheel.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {wheel.description}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
