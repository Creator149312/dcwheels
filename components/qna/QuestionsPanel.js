"use client";

import { useEffect, useState } from "react";
import QuestionComposer from "./QuestionComposer";
import QuestionCard from "./QuestionCard";

// layout = "vertical" renders the original stacked list.
// layout = "horizontal" renders question cards as a horizontally scrollable row.
export default function QuestionsPanel({
  type,               // contentType: "anime", "movie", "game"
  contentId,
  isLoggedIn,
  openLoginPrompt,
  currentUserId,
  layout = "vertical",
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

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
  };

  const handleUpdated = (updatedQ) => {
    setQuestions((prev) =>
      prev.map((q) => (q._id === updatedQ._id ? updatedQ : q))
    );
  };

  return (
    <div className="space-y-4">
      {/* Composer */}
      <QuestionComposer
        type={type}
        contentId={contentId}
        isLoggedIn={isLoggedIn}
        openLoginPrompt={openLoginPrompt}
        onCreated={handleCreated}
      />

      {/* Question Feed */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading questions…</p>
      ) : questions.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md text-sm text-gray-600 dark:text-gray-300">
          No questions yet. Be the first to ask!
        </div>
      ) : (
        <div
          className={
            layout === "horizontal"
              ? "flex overflow-x-auto gap-4 pb-3 [&::-webkit-scrollbar]:hidden"
              : "space-y-4"
          }
          style={
            layout === "horizontal"
              ? { scrollbarWidth: "none", msOverflowStyle: "none" }
              : {}
          }
        >
          {questions.map((q) => (
            // Wrapper div gives each card a fixed width in horizontal mode
            <div
              key={q._id}
              className={layout === "horizontal" ? "w-72 flex-shrink-0" : undefined}
            >
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
    </div>
  );
}
