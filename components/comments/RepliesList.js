"use client";
import CommentItem from "./CommentItem";

export default function RepliesList({
  replies,
  currentUser,
  isLoggedIn,
  onReply,
  onEdit,
}) {
  return (
    <div className="ml-10 mt-2 border-l border-gray-200 dark:border-gray-700 pl-3 space-y-3">
      {replies.map((reply) => (
        <CommentItem
          key={reply._id}
          comment={reply}
          currentUser={currentUser}
          isLoggedIn={isLoggedIn}
          onReply={onReply}
          onEdit={onEdit}
          fetchReplies={() => {}} // replies won't have replies
        />
      ))}
    </div>
  );
}
