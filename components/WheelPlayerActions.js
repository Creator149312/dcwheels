'use client'
import ReactionButton from "./ReactionButton";
import SharePopup from "./SharePopup";

export default function WheelPlayerActions({
  currentPath,
  wheelID,
  stats,
  openLoginPrompt,
  session,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Left: Avatar + Info */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-sm font-bold">
          W
        </div>
        <div className="flex flex-col">
          <span className="font-semibold">WheelPlayer</span>
          <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
              #spin
            </span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
              #anime
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Like Button */}
        <button
          onClick={handleLike}
          className="px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#3a3a3a] text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700"
        >
          👍 <span className="opacity-75">{likes}</span>
        </button>

        {/* Reaction Button */}
        <ReactionButton
          entityType="wheel"
          entityId={wheelID}
          reactionType="like"
          initialCount={stats?.reactions?.like || 0}
          reactedByCurrentUser={stats?.reactedByUser?.like || false}
          isLoggedIn={!!session}
          openLoginPrompt={openLoginPrompt}
        />

        {/* Share */}
        <SharePopup url={currentPath} />
      </div>
    </div>
  );
}
