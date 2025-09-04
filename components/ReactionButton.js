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

  const toggleReaction = async () => {
    if (!isLoggedIn) return openLoginPrompt?.();

    try {
      const res = await fetch("/api/reactiontest/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, reactionType }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCount(data.count);
      setReacted(data.reactedByCurrentUser);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button
      onClick={toggleReaction}
      className={`flex items-center gap-1 hover:text-blue-600 transition ${
        reacted ? "text-blue-600" : ""
      }`}
    >
      👍 {count}
    </button>
  );
}
