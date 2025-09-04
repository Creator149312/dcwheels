"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";

export default function FollowButton({
  entityType,
  entityId,
  initialFollow = false,
  onToggle,
}) {
  const { data: session } = useSession();
  const [isFollowing, setIsFollowing] = useState(initialFollow);
  const [loading, setLoading] = useState(false);

  const requireLogin = () => {
    if (!session) {
      if (confirm("You need to log in to follow. Log in now?")) {
        signIn();
      }
      return false;
    }
    return true;
  };

  const toggleFollow = async () => {
    if (!requireLogin()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsFollowing(data.isFollowing);
        onToggle?.(data.isFollowing);
      } else {
        alert(data.error || "Unable to update follow status");
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
      className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
        isFollowing
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          : "bg-white text-blue-600 border-blue-600 hover:bg-blue-50"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
