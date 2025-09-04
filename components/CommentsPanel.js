"use client";

import { useEffect, useState } from "react";

export default function CommentsPanel({
  entityType,
  entityId,
  isLoggedIn = false,
  openLoginPrompt,
  currentUser,
  visible = false,
}) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);

  const COMMENTS_PER_PAGE = 5;

  useEffect(() => {
    if (visible && !loadedOnce) {
      fetchComments(0);
      setLoadedOnce(true);
    }
  }, [visible]);

  const fetchComments = async (pageIndex = 0) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/comments?entityType=${entityType}&entityId=${entityId}&limit=${COMMENTS_PER_PAGE}&skip=${pageIndex * COMMENTS_PER_PAGE}`
      );
      if (!res.ok) throw new Error("Failed to load comments");
      const data = await res.json();
      setComments((prev) => [...prev, ...data]);
      setHasMore(data.length === COMMENTS_PER_PAGE);
      setPage(pageIndex + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) return openLoginPrompt?.();
    if (!newComment.trim()) return;

    setPosting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          text: newComment.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to post comment");
      const comment = await res.json();
      setComments((prev) => [comment, ...prev]);
      setNewComment("");
      setFocused(false);
    } catch (err) {
      console.error(err);
    } finally {
      setPosting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="space-y-4">
      {/* Sleek YouTube-style comment input */}
      <form onSubmit={handleSubmit} className="space-y-1">
        <input
          type="text"
          placeholder={isLoggedIn ? "Add a comment…" : "Log in to comment"}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onFocus={() => setFocused(true)}
          disabled={!isLoggedIn || posting}
          className={`w-full border rounded-md px-3 py-2 text-sm transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
            focused ? "h-12" : "h-10"
          }`}
        />
        {focused && isLoggedIn && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Post as {currentUser?.name || "User"}
            </span>
            <button
              type="submit"
              disabled={!newComment.trim() || posting}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                posting || !newComment.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        )}
      </form>

      {/* Comment list */}
      {loading && comments.length === 0 ? (
        <p className="text-sm text-gray-500">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-gray-500">No comments yet.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c._id} className="text-sm border-b pb-2">
              <div className="font-semibold">{c.userId?.name || "User"}</div>
              <div>{c.text}</div>
            </li>
          ))}
        </ul>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={() => fetchComments(page)}
          className="text-sm text-blue-600 hover:underline"
        >
          Load more
        </button>
      )}
    </div>
  );
}
