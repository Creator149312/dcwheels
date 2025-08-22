"use client";
import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function ReactionBar({
  initialReactions,
  isFollowing: initialFollow,
  contentId,
  type,
}) {
  const { data: session } = useSession();
  const [reactions, setReactions] = useState(initialReactions || {});
  const [isFollowing, setIsFollowing] = useState(initialFollow || false);

  const requireLogin = () => {
    if (!session) {
      if (confirm("You need to log in to do this. Log in now?")) {
        signIn();
      }
      return false;
    }
    return true;
  };

  const handleReaction = async (reactionType) => {
    if (!requireLogin()) return;

    const res = await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, type, reaction: reactionType }),
    });

    const data = await res.json();
    if (res.ok) {
      setReactions(data.reactions);
    } else {
      alert(data.error || "Unable to react");
    }
  };

  const handleFollow = async () => {
    if (!requireLogin()) return;

    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId, type }),
    });

    const data = await res.json();
    if (res.ok) {
      setIsFollowing(data.isFollowing);
    } else {
      alert(data.error || "Unable to update follow status");
    }
  };

  const reactionTypes = [
    { key: "like", label: "Like", icon: "👍" },
    // More reactions like { key: "heart", label: "Love", icon: "❤️" }
  ];

  return (
    <div className="flex flex-wrap gap-3 items-center mt-4">
      {reactionTypes.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => handleReaction(key)}
          className="flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          <span>{icon}</span>
          <span className="text-sm">{label}</span>
          {reactions[key] > 0 && (
            <span className="text-xs text-gray-600 dark:text-gray-300">
              {reactions[key]}
            </span>
          )}
        </button>
      ))}

      <button
        onClick={handleFollow}
        className={`px-4 py-1 rounded-full border ${
          isFollowing
            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
            : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
        } transition`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}
