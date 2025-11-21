"use client";

import { useState } from "react";
import PostForm from "./PostForm";

const reactionTypes = [
  { type: "like", icon: "👍" },
  { type: "love", icon: "❤️" },
  { type: "laugh", icon: "😂" },
];

const Post = ({ post, onUpdatePosts }) => {
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [showShareForm, setShowShareForm] = useState(false);

  const handleReaction = (type) => {
    const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = storedPosts.map((p) => {
      if (p.id === post.id) {
        const reactionsToUpdate = p.reactions || {};
        return {
          ...p,
          reactions: {
            ...reactionsToUpdate,
            [type]: (reactionsToUpdate[type] || 0) + 1,
          },
        };
      }
      return p;
    });
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    onUpdatePosts(updatedPosts);
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const storedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = storedPosts.map((p) => {
      if (p.id === post.id) {
        const commentsToUpdate = p.comments || [];
        return {
          ...p,
          comments: [
            ...commentsToUpdate,
            { id: Date.now(), text: newComment, timestamp: new Date().toISOString() },
          ],
        };
      }
      return p;
    });
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    onUpdatePosts(updatedPosts);
    setNewComment("");
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      {/* Post Header */}
      <div className="flex items-center space-x-2 mb-2">
        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
        <div>
          <p className="font-bold">User Name</p>
          <p className="text-sm text-gray-500">
            {new Date(post.timestamp).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <p className="text-gray-800 mb-4">{post.content}</p>

      {/* Post Images */}
      {post.imageUrls?.length > 0 && (
        <div
          className={`grid gap-2 ${
            post.imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {post.imageUrls.map((imageUrl, index) => (
            <img
              key={index}
              src={imageUrl}
              alt={`Post image ${index}`}
              className="w-full object-cover rounded-md"
            />
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center text-gray-500 mt-4">
        {/* Reactions */}
        <div className="flex space-x-2">
          {reactionTypes.map(({ type, icon }) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className="flex items-center space-x-1"
            >
              <span>{icon}</span>
              <span className="text-sm">{post.reactions?.[type] || 0}</span>
            </button>
          ))}
        </div>

        <div className="flex space-x-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-1"
          >
            💬 <span className="text-sm">Comment</span>
          </button>
          <button
            onClick={() => setShowShareForm(true)}
            className="flex items-center space-x-1"
          >
            🔗 <span className="text-sm">Share</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          {post.comments?.length > 0 ? (
            post.comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start space-x-2 bg-gray-100 p-2 rounded-lg mb-2 text-sm"
              >
                <div className="w-6 h-6 bg-gray-400 rounded-full"></div>
                <div>
                  <p>{comment.text}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(comment.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No comments yet.</p>
          )}

          <form onSubmit={handleAddComment} className="mt-4 flex space-x-2">
            <input
              type="text"
              className="flex-1 p-2 rounded-full border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              className="bg-blue-500 text-white rounded-full px-4 py-2 text-sm"
            >
              Post
            </button>
          </form>
        </div>
      )}

      {/* Share Popup */}
      {showShareForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="relative p-6 bg-white rounded-xl max-w-lg w-full shadow-2xl">
            <button
              onClick={() => setShowShareForm(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">Share this post</h2>
            <PostForm
              initialContent={`Check this out: "${post.content}"`}
              onClose={() => setShowShareForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Post;
