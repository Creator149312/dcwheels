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
    <form onSubmit={handleSubmit} className="space-y-2">
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
        className="w-full border border-border/80 rounded-xl px-3 py-2.5 text-sm bg-card text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
      />

      {isLoggedIn && focused && (
        <div className="flex justify-between items-center px-0.5">
          <span className="text-xs text-muted-foreground/90">
            Posting as {currentUser?.name || "User"}
          </span>
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              loading || !text.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {loading ? "Posting…" : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
