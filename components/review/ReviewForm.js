"use client";

import { useState } from "react";

export default function ReviewForm({
  recommend,            // boolean
  onSubmit,             // async (payload) => void
  minChars = 20,        // configurable
  submitting = false,   // external control optional
  isLoggedIn = false,   // NEW: for login gating in UI
  openLoginPrompt,      // NEW: fn to trigger login modal
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const isPositive = recommend === true;
  const title = isPositive
    ? "What did you like? Why would you recommend it?"
    : "What went wrong? Why would you not recommend it?";

  const placeholder = isPositive
    ? "Share what stood out: story, pacing, performances, vibe…"
    : "Be constructive: pacing issues, bugs, plot holes, expectations…";

  const remaining = Math.max(0, minChars - text.trim().length);
  const canSubmit =
    text.trim().length >= minChars &&
    recommend !== null &&
    !busy &&
    !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      openLoginPrompt?.();
      return;
    }
    if (!canSubmit) return;

    try {
      setBusy(true);
      await onSubmit({ recommend, text: text.trim() });
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h4 className="text-sm font-semibold">{title}</h4>

      <textarea
        className="w-full min-h-[120px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
      />

      <div className="flex items-center justify-between text-xs">
        <span className={remaining > 0 ? "text-gray-500" : "text-green-600"}>
          {remaining > 0
            ? `Write ${remaining} more characters`
            : "Looks good!"}
        </span>
        <button
          type="submit"
          disabled={!canSubmit && isLoggedIn}
          className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
            isLoggedIn
              ? canSubmit
                ? isPositive
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {busy || submitting
            ? "Submitting…"
            : !isLoggedIn
            ? "Log in to review"
            : "Submit Review"}
        </button>
      </div>
    </form>
  );
}
