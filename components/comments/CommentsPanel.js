"use client";
import { useEffect, useRef, useState } from "react";
import CommentForm from "./CommentForm";
import CommentItem from "./CommentItem";

export default function CommentsPanel({
  entityType,
  entityId,
  isLoggedIn = false,
  openLoginPrompt,
  currentUser,
  visible = false,
  onCountChange,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const mutationVersionRef = useRef(0);

  useEffect(() => {
    if (visible) fetchTopLevelComments();
  }, [visible]);

  const fetchTopLevelComments = async (isLoadMore = false) => {
    if (loading && !isLoadMore) return;
    const fetchVersion = mutationVersionRef.current;
    const skip = isLoadMore ? comments.length : 0;
    
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?entityType=${entityType}&entityId=${entityId}&parentCommentId=null&limit=15&skip=${skip}`
      );
      const data = await res.json();
      const mappedComments = data.map((c) => ({
        ...c,
        replies: [],
        repliesLoaded: false,
        replyCount: c.replyCount ?? 0,
      }));

      setComments((prev) => {
        if (!isLoadMore && mutationVersionRef.current === fetchVersion) {
            return mappedComments;
        }

        const merged = [...prev];
        const seenIds = new Set(merged.map((comment) => String(comment._id)));

        for (const comment of mappedComments) {
          const commentId = String(comment._id);
          if (!seenIds.has(commentId)) {
            merged.push(comment);
            seenIds.add(commentId);
          }
        }
        return merged;
      });
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
    mutationVersionRef.current += 1;
    setComments((prev) => [optimisticComment, ...prev]);
    onCountChange?.((prev) => prev + 1);
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

  const handleDelete = async (commentId) => {
    // Determine if it's a top-level comment or a reply
    const isTopLevel = comments.some((c) => String(c._id) === String(commentId));
    let repliesCount = 0;

    if (isTopLevel) {
      const target = comments.find((c) => String(c._id) === String(commentId));
      repliesCount = target.replyCount || 0;
      setComments((prev) => prev.filter((c) => String(c._id) !== String(commentId)));
    } else {
      setComments((prev) =>
        prev.map((c) => ({
          ...c,
          replies: (c.replies || []).filter((r) => String(r._id) !== String(commentId)),
          replyCount: c.replies?.some((r) => String(r._id) === String(commentId))
            ? Math.max((c.replyCount || 1) - 1, 0)
            : c.replyCount,
        }))
      );
    }

    // Update global count
    onCountChange?.((prev) => Math.max(prev - 1 - repliesCount, 0));

    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete comment");
    } catch (err) {
      console.error(err);
      // Optional: re-fetch if failed, though UI already updated
    }
  };

  if (!visible) return null;

  return (
    <div className="mt-0 space-y-4" id="comments">
      <CommentForm
        onSubmit={handleAddComment}
        isLoggedIn={isLoggedIn}
        currentUser={currentUser}
        openLoginPrompt={openLoginPrompt}
        loading={posting}
        autoFocus={false}
      />

      {loading && comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground/60 font-medium">
            Loading comments…
          </p>
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center mb-2 text-muted-foreground/40">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground/90 font-medium">
            No comments yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-1">
            {comments.map((c) => (
              <CommentItem
                key={c._id}
                comment={c}
                currentUser={currentUser}
                isLoggedIn={isLoggedIn}
                openLoginPrompt={openLoginPrompt}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                fetchReplies={fetchReplies}
              />
            ))}
          </ul>
          
          {/* Simple Load More Trigger or Indicator */}
          {comments.length >= 15 && (
            <div className="flex justify-center pt-2">
               <button 
                  onClick={() => fetchTopLevelComments(true)}
                  disabled={loading}
                  className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors px-4 py-2 hover:bg-muted/50 rounded-full"
               >
                 {loading ? "Loading..." : "Show more comments"}
               </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
