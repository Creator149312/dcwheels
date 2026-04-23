"use client";
import { useState } from "react";
import { BiLike, BiSolidLike } from "react-icons/bi";

function formatCount(n) {
  if (!n || n === 0) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

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

    // Optimistic update
    const wasReacted = reacted;
    const prevCount = count;
    setReacted(!wasReacted);
    setCount(wasReacted ? prevCount - 1 : prevCount + 1);

    setLoading(true);
    try {
      const res = await fetch("/api/reactiontest/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, reactionType }),
      });

      if (!res.ok) throw new Error("Failed to toggle reaction");

      const data = await res.json();
      setCount(data.count);
      setReacted(data.reactedByCurrentUser);
    } catch (err) {
      // Revert on failure
      setReacted(wasReacted);
      setCount(prevCount);
      console.error("Reaction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const Icon = reacted ? BiSolidLike : BiLike;

  return (
    <button
      onClick={toggleReaction}
      disabled={loading}
      aria-pressed={reacted}
      aria-label={reacted ? "Unlike" : "Like"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition ${
        reacted
          ? "border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
          : "border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-[#272727] dark:hover:bg-[#3a3a3a] dark:text-gray-100"
      } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
    >
      <Icon className="text-base" />
      <span>{formatCount(count)}</span>
    </button>
  );
}
