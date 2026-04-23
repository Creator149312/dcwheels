"use client";

import { useEffect, useState } from "react";
import QuestionComposer from "./QuestionComposer";
import QuestionCard from "./QuestionCard";

// layout:
//   "vertical"   — original stacked list
//   "horizontal" — horizontally scrollable row
//   "grid"       — 2-column responsive grid (best for quick-tap polls)
export default function QuestionsPanel({
  type,
  contentId,
  contentSlug,
  contentTags,
  isLoggedIn,
  openLoginPrompt,
  currentUserId,
  layout = "vertical",
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/questions?contentType=${type}&contentId=${contentId}`
      );
      if (!res.ok) throw new Error("Failed to load questions");
      const data = await res.json();
      setQuestions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [type, contentId]);

  const handleCreated = (newQ) => {
    setQuestions((prev) => [newQ, ...prev]);
    setComposerOpen(false);
  };

  const handleUpdated = (updatedQ) => {
    setQuestions((prev) =>
      prev.map((q) => (q._id === updatedQ._id ? updatedQ : q))
    );
  };

  const gridClass =
    layout === "grid"
      ? "grid grid-cols-1 sm:grid-cols-2 gap-3"
      : layout === "horizontal"
      ? "flex overflow-x-auto gap-4 pb-3 [&::-webkit-scrollbar]:hidden"
      : "space-y-4";

  const gridStyle =
    layout === "horizontal"
      ? { scrollbarWidth: "none", msOverflowStyle: "none" }
      : {};

  const itemClass =
    layout === "horizontal" ? "w-72 flex-shrink-0" : undefined;

  return (
    <div className="space-y-4">
      {/* Question Feed — shown first so social proof is visible before the CTA */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : questions.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-300">
          No polls yet. Be the first to ask!
        </div>
      ) : (
        <div className={gridClass} style={gridStyle}>
          {questions.map((q) => (
            <div key={q._id} className={itemClass}>
              <QuestionCard
                data={q}
                isLoggedIn={isLoggedIn}
                openLoginPrompt={openLoginPrompt}
                currentUserId={currentUserId}
                onUpdated={handleUpdated}
              />
            </div>
          ))}
        </div>
      )}

      {/* Composer — collapsed behind "+ Ask a question" button */}
      {composerOpen ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3 pb-0">
            <span className="text-sm font-semibold">New Poll</span>
            <button
              onClick={() => setComposerOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕ Cancel
            </button>
          </div>
          <QuestionComposer
            type={type}
            contentId={contentId}
            contentSlug={contentSlug}
            contentTags={contentTags}
            isLoggedIn={isLoggedIn}
            openLoginPrompt={openLoginPrompt}
            onCreated={handleCreated}
          />
        </div>
      ) : (
        <button
          onClick={() => {
            if (!isLoggedIn) return openLoginPrompt?.();
            setComposerOpen(true);
          }}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          + Ask a question
        </button>
      )}
    </div>
  );
}
