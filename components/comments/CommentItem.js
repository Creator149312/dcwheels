"use client";
import { useState } from "react";
import { timeAgo } from "./helpers";
import CommentForm from "./CommentForm";
import RepliesList from "./RepliesList";

export default function CommentItem({
  comment,
  currentUser,
  isLoggedIn,
  onReply,
  onEdit,
  fetchReplies,
}) {
  const username = comment.userId?.name || "User";
  const initials = username.charAt(0).toUpperCase();
  const isAuthor = currentUser?._id === comment.userId?._id;

  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const replyCount = comment.replyCount ?? comment.replies?.length ?? 0;

  const handleToggleReplies = async () => {
    if (!expanded && !comment.repliesLoaded && replyCount > 0) {
      await fetchReplies(comment._id);
    }
    setExpanded((v) => !v);
  };

  return (
    <div className="text-sm border-b border-gray-200 dark:border-gray-700 pb-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-black dark:text-white">
          {initials}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {username}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {timeAgo(comment.createdAt)}
            </span>
          </div>

          {isEditing ? (
            <CommentForm
              isLoggedIn={isLoggedIn}
              currentUser={currentUser}
              initialValue={comment.text}
              submitLabel="Save"
              onSubmit={(text, reset) => {
                onEdit(comment._id, text);
                setIsEditing(false);
                reset();
              }}
            />
          ) : (
            <div className="mt-1 text-gray-800 dark:text-gray-200">
              {comment.text}
            </div>
          )}

          <div className="flex gap-3 mt-1 text-xs">
            {/* Reply button only for parent comments */}
            {comment.parentCommentId == null && (
              <button
                className="text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setIsReplying(!isReplying)}
              >
                Reply
              </button>
            )}
            {isAuthor && (
              <button
                className="text-gray-500 dark:text-gray-400 hover:underline"
                onClick={() => setIsEditing(!isEditing)}
              >
                Edit
              </button>
            )}
          </div>

          {isReplying && (
            <div className="mt-2">
              <CommentForm
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                placeholder="Write a reply…"
                submitLabel="Reply"
                onSubmit={(text, reset) => {
                  onReply(comment._id, text);
                  setIsReplying(false);
                  reset();
                }}
              />
            </div>
          )}

          {replyCount > 0 && comment.parentCommentId == null && (
            <button
              onClick={handleToggleReplies}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ChevronIcon open={expanded} />
              {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}

          {expanded && comment.replies?.length > 0 && (
            <RepliesList
              replies={comment.replies}
              currentUser={currentUser}
              isLoggedIn={isLoggedIn}
              onReply={onReply}
              onEdit={onEdit}
              disableReply
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}
