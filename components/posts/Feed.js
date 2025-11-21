// components/Feed.js
"use client";

import { useState, useEffect } from "react";
import Post from "./Post";

const Feed = () => {
  const [posts, setPosts] = useState([]);

  const loadPosts = () => {
    try {
      const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
      const sorted = storedPosts.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
      setPosts(sorted);
    } catch (err) {
      console.error("Failed to load posts:", err);
    }
  };

  useEffect(() => {
    loadPosts();

    const handleStorageChange = (e) => {
      if (e.key === "posts") loadPosts();
    };
    const handlePostsUpdated = () => loadPosts();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("postsUpdated", handlePostsUpdated);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("postsUpdated", handlePostsUpdated);
    };
  }, []);

  if (posts.length === 0) {
    return (
      <div className="text-center text-gray-500 mt-8">
        No posts yet. Start by creating one!
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Post key={post.id} post={post} onUpdatePosts={setPosts} />
      ))}
    </div>
  );
};

export default Feed;
