"use client";
import { useState } from "react";

export default function CommentForm({
  onSubmit,
  isLoggedIn,
  currentUser,
  placeholder = "Add a comment…",
  autoFocus = false,
  initialValue = "",
  submitLabel = "Post",
  loading = false,
}) {
  const [text, setText] = useState(initialValue);
  const [focused, setFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text.trim(), () => setText(""));
    setFocused(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <input
        type="text"
        placeholder={isLoggedIn ? placeholder : "Log in to comment"}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          if (!text.trim()) setFocused(false);
        }}
        autoFocus={autoFocus}
        disabled={!isLoggedIn || loading}
        className="w-full border border-border rounded-md px-2 py-2 text-sm 
                   bg-card text-foreground
                   focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {isLoggedIn && focused && (
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Posting as {currentUser?.name || "User"}
          </span>
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              loading || !text.trim()
                ? "bg-gray-300 bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {loading ? "Posting…" : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
