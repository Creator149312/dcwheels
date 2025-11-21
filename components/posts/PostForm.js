// components/PostForm.js
"use client";

import { useState, useRef, useEffect } from "react";

const PostForm = ({ initialContent = "", onClose }) => {
  const [postContent, setPostContent] = useState(initialContent);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [postType, setPostType] = useState("default"); // future-proofing

  // revoke object URLs on cleanup to avoid memory leaks
  useEffect(() => {
    return () => {
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imagePreviews]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newPreviews = files.map((file) => URL.createObjectURL(file));

    setImages((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEmojiClick = (emoji) => {
    setPostContent((prev) => prev + emoji);
  };

  const resetForm = () => {
    setPostContent("");
    setImages([]);
    setImagePreviews([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postContent.trim() && images.length === 0) return;

    setIsLoading(true);

    const newPost = {
      id: Date.now(),
      type: postType,
      content: postContent,
      imageUrls: imagePreviews,
      timestamp: new Date().toISOString(),
    };

    try {
      const existingPosts =
        JSON.parse(localStorage.getItem("posts") || "[]") || [];
      localStorage.setItem(
        "posts",
        JSON.stringify([newPost, ...existingPosts])
      );

      // 🔔 Dispatch event so Feed updates immediately
      window.dispatchEvent(new Event("postsUpdated"));
    } catch (err) {
      console.error("Failed to save post:", err);
    }

    // simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    resetForm();
    setIsLoading(false);

    if (onClose) onClose();
  };

  const emojiOptions = ["😀", "😂", "😎", "😍", "🤔"];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0" />
          <textarea
            aria-label="Post content"
            className="w-full h-20 p-2 text-gray-700 bg-gray-100 rounded-lg outline-none resize-none"
            placeholder="What's on your mind?"
            value={postContent}
            onChange={(e) => setPostContent(e.target.value)}
          />
        </div>

        {/* Image Previews */}
        {imagePreviews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
            {imagePreviews.map((previewUrl, index) => (
              <div
                key={index}
                className="relative rounded-lg overflow-hidden group"
              >
                <img
                  src={previewUrl}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              aria-label="Add photo"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 text-gray-600 hover:text-blue-500"
            >
              📷 <span>Photo</span>
            </button>
            <div className="flex space-x-1">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Insert ${emoji}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-lg hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className={`py-2 px-4 rounded-full font-bold transition-colors ${
              (postContent.trim() || images.length > 0) && !isLoading
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            disabled={(!postContent.trim() && images.length === 0) || isLoading}
          >
            {isLoading ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PostForm;
