"use client";

import CreateWheelButton from "./CreateWheelButton";
import ReviewsPanel from "@components/review/ReviewsPanel";
import QuestionsPanel from "@components/qna/QuestionsPanel";
import { useLoginPrompt } from "@app/LoginPromptProvider";

// Consistent section header used across all three stacked blocks.
// The blue accent bar visually groups title + action together.
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

// Sections are stacked (no tabs) so all content is visible on scroll.
// Each section's list scrolls horizontally to keep vertical height compact.
//
// Order is intentional:
//   1. Picker Wheels  — SpinPapa's unique feature; shown first and most prominent
//   2. Community Votes — decision-focused Q&A; unique to SpinPapa
//   3. Quick Takes     — lightweight reviews; placed last (IMDB does full reviews better)
export default function TopicInteractionTabs({
  type,
  pageId,
  contentId,
  taggedWheels = [],
  isLoggedIn,
  currentUserId,
}) {
  const openLoginPrompt = useLoginPrompt();

  return (
    <div className="space-y-12">

      {/* ── 1. Picker Wheels ──────────────────────────────────────────────
           This is SpinPapa's moat. Every piece of content gets its own
           community-generated spin wheels for decision-making.

           CreateWheelButton is temporarily commented out — it will be
           replaced by the contextual "Add to Watchlist / Spin Similar"
           action flow in the next iteration.                               */}
      <section>
        {/* CreateWheelButton routes to the main spinner with this content
             pre-tagged — users can build a "Spin Similar" wheel instantly.  */}
        <SectionHeader
          title="🎡 Picker Wheels"
          action={<CreateWheelButton type={type} contentId={contentId} />}
        />

        {taggedWheels.length === 0 ? (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <span className="text-2xl">🎡</span>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              No wheels yet for this {type}.{" "}
              <span className="font-semibold">Be the first to create one!</span>
            </p>
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
                className="group w-52 flex-shrink-0 block bg-gray-50 dark:bg-gray-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl p-4 transition-colors"
              >
                {/* Wheel icon accent */}
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-3 text-base">
                  🎡
                </div>
                <h3 className="text-sm font-semibold truncate mb-1 group-hover:text-blue-600 transition-colors">
                  {wheel.title}
                </h3>
                {wheel.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                    {wheel.description}
                  </p>
                )}
              </a>
            ))}
          </div>
        )}
      </section>

      {/* ── 2. Community Votes ────────────────────────────────────────────
           Decision-focused Q&A. Unique to SpinPapa — helps users decide
           whether to watch/play by seeing how the community voted.         */}
      <section>
        <SectionHeader title="🗳️ Community Votes" />
        <QuestionsPanel
          type={type}
          contentId={pageId}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
          currentUserId={currentUserId}
          layout="horizontal"
        />
      </section>

      {/* ── 3. Quick Takes ────────────────────────────────────────────────
           Lightweight community reviews. Placed last — for deep-dive
           opinions after the user has already decided to engage.           */}
      <section>
        <SectionHeader title="💬 Quick Takes" />
        <ReviewsPanel
          type={type}
          contentId={pageId}
          isLoggedIn={isLoggedIn}
          openLoginPrompt={openLoginPrompt}
          layout="horizontal"
        />
      </section>

    </div>
  );
}
