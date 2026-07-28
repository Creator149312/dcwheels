"use client";
import CommentItem from "./CommentItem";

export default function RepliesList({
  replies,
  currentUser,
  isLoggedIn,
  onReply,
  onEdit,
  onDelete,
}) {
  return (
    <div className="mt-2 space-y-4">
      {replies.map((reply) => (
        <CommentItem
          key={reply._id}
          comment={reply}
          currentUser={currentUser}
          isLoggedIn={isLoggedIn}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          fetchReplies={() => {}} // replies won't have replies
        />
      ))}
    </div>
  );
}
