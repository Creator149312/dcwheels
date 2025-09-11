"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function FollowButton({
  entityType,
  entityId,
  initialFollow = false,
  initialCount = 0,               // follower count from server
  onToggle,
  openLoginPrompt,
  labelFollow = "Follow",
  labelFollowing = "Following",
  className = "",
}) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(initialFollow);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const requireLogin = () => {
    if (!session) {
      if (openLoginPrompt) {
        openLoginPrompt();
      } else {
        signIn();
      }
      return false;
    }
    return true;
  };

  const toggleFollow = async () => {
    if (!requireLogin() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });

      const { isFollowing: nextState, followerCount, error } = await res.json();

      if (res.ok) {
        setIsFollowing(nextState);
        setCount(followerCount);
        onToggle?.(nextState, followerCount);
      } else {
        alert(error || "Unable to update follow status");
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggleFollow}
      disabled={loading}
      aria-pressed={isFollowing}
      aria-label={`${isFollowing ? labelFollowing : labelFollow} (${count})`}
      className={`
        px-4 py-1 rounded-full border text-sm font-medium transition
        ${isFollowing
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"}
        ${loading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {isFollowing ? labelFollowing : labelFollow}
      <span className="ml-1 text-xs opacity-80">({count})</span>
    </button>
  );
}
