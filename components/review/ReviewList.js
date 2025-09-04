"use client";

import ReactionButton from "@components/ReactionButton";

// Helper to format relative time
function formatRelativeTime(dateString) {
  const now = new Date();
  const then = new Date(dateString);
  const diff = Math.floor((now - then) / 1000); // seconds

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return then.toLocaleDateString(); // fallback to date
}

export default function ReviewList({
  reviews = [],
  isLoggedIn = false,
  openLoginPrompt,
}) {
  if (!reviews.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No reviews yet. Be the first to share your thoughts!
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {reviews.map((rev) => (
        <li
          key={rev._id}
          className="border border-gray-200 dark:border-gray-700 rounded-md p-3 bg-white dark:bg-gray-900"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            {rev.user?.avatar && (
              <img
                src={rev.user.avatar}
                alt={rev.user.name}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-sm font-semibold">
              {rev.user?.name || "Anonymous"}
            </span>
            <span className="text-xs text-gray-500 ml-1">
              • {formatRelativeTime(rev.createdAt)}
            </span>
            <span
              className={`ml-auto text-xs font-medium ${
                rev.recommend ? "text-green-600" : "text-red-600"
              }`}
            >
              {rev.recommend ? "Recommended" : "Not Recommended"}
            </span>
          </div>

          {/* Review Text */}
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">
            {rev.text}
          </p>

          {/* Like (Reaction) */}
          <div className="flex mt-2 text-xs text-gray-500">
            <ReactionButton
              entityType="review"
              entityId={rev._id}
              reactionType="like"
              initialCount={rev.likesCount || 0}
              reactedByCurrentUser={rev.likedByCurrentUser || false}
              isLoggedIn={isLoggedIn}
              openLoginPrompt={openLoginPrompt}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
