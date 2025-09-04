"use client";
import { useState } from "react";

export default function ReactionButton({
  entityType,
  entityId,
  reactionType = "like",
  initialCount = 0,
  reactedByCurrentUser = false,
  isLoggedIn,
  openLoginPrompt,
}) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(reactedByCurrentUser);
  const [loading, setLoading] = useState(false);

  const toggleReaction = async () => {
    if (!isLoggedIn) return openLoginPrompt?.();
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/reactiontest/toggle", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entityType, entityId, reactionType }),
      });

      if (!res.ok) throw new Error("Failed to toggle reaction");

      const data = await res.json();
      setCount(data.count);
      setReacted(data.reactedByCurrentUser);
    } catch (err) {
      console.error("Reaction error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleReaction}
      disabled={loading}
      aria-pressed={reacted}
      aria-label={`React with ${reactionType}`}
      className={`flex items-center gap-1 px-3 py-2 rounded-md transition ${
        reacted ? "text-blue-600" : "text-gray-600"
      } ${loading ? "opacity-50 cursor-not-allowed" : "hover:text-blue-600"}`}
    >
      👍 {loading ? "…" : count}
    </button>
  );
}
