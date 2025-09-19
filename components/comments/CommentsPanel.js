"use client";
import { useEffect, useState } from "react";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";

export default function CommentsPanel({
  entityType,
  entityId,
  isLoggedIn = false,
  openLoginPrompt,
  currentUser,
  visible = false,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (visible) fetchTopLevelComments();
  }, [visible]);

  const fetchTopLevelComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?entityType=${entityType}&entityId=${entityId}&parentCommentId=null`
      );
      const data = await res.json();
      setComments(
        data.map((c) => ({
          ...c,
          replies: [],
          repliesLoaded: false,
          replyCount: c.replyCount ?? 0,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (parentId) => {
    try {
      const res = await fetch(
        `/api/comments?entityType=${entityType}&entityId=${entityId}&parentCommentId=${parentId}`
      );
      const data = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c._id === parentId
            ? {
                ...c,
                replies: data,
                repliesLoaded: true,
                replyCount: c.replyCount ?? data.length,
              }
            : c
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (text, reset) => {
    if (!isLoggedIn) return openLoginPrompt?.();
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      _id: tempId,
      userId: currentUser,
      text,
      createdAt: new Date().toISOString(),
      replies: [],
      repliesLoaded: false,
      replyCount: 0,
    };
    setComments((prev) => [optimisticComment, ...prev]);
    reset();

    try {
      setPosting(true);
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, text }),
      });
      const saved = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c._id === tempId
            ? { ...saved, replies: [], repliesLoaded: false, replyCount: 0 }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      setComments((prev) => prev.filter((c) => c._id !== tempId));
    } finally {
      setPosting(false);
    }
  };

  const handleReply = async (parentId, text) => {
    if (!isLoggedIn) return openLoginPrompt?.();
    const tempId = `temp-${Date.now()}`;
    const optimisticReply = {
      _id: tempId,
      userId: currentUser,
      text,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) =>
      prev.map((c) =>
        c._id === parentId
          ? {
              ...c,
              replyCount: (c.replyCount ?? c.replies.length ?? 0) + 1,
              replies: [...c.replies, optimisticReply],
            }
          : c
      )
    );

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          text,
          parentCommentId: parentId,
        }),
      });
      const saved = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c._id === parentId
            ? {
                ...c,
                replies: c.replies.map((r) =>
                  r._id === tempId ? saved : r
                ),
              }
            : c
        )
      );
    } catch (err) {
      console.error(err);
      setComments((prev) =>
        prev.map((c) =>
          c._id === parentId
            ? {
                ...c,
                replyCount: Math.max((c.replyCount ?? 1) - 1, 0),
                replies: c.replies.filter((r) => r._id !== tempId),
              }
            : c
        )
      );
    }
  };

  const handleEdit = async (commentId, text) => {
    setComments((prev) =>
      prev.map((c) =>
        c._id === commentId
          ? { ...c, text }
          : {
              ...c,
              replies: c.replies?.map((r) =>
                r._id === commentId ? { ...r, text } : r
              ),
            }
      )
    );

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error("Failed to update comment");
    } catch (err) {
      console.error(err);
    }
  };

  if (!visible) return null;

  return (
    <div className="space-y-4" id="comments">
      <CommentForm
        onSubmit={handleAddComment}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        loading={posting}
      />

      {loading && comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Loading comments…
        </p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No comments yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              currentUser={currentUser}
              isLoggedIn={isLoggedIn}
              onReply={handleReply}
              onEdit={handleEdit}
              fetchReplies={fetchReplies}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
